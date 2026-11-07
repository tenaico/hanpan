/**
 * Windows share sheet helper (공유하기): opens the system Share UI with files
 * attached, for the app window whose handle it is given.
 *
 *   win-share.exe <owner-hwnd> <file> [<file> ...]
 *
 * Why a separate program: DataTransferManager is reached from a desktop app
 * through IDataTransferManagerInterop, and GetForWindow only accepts a window
 * of the calling process (another process's HWND answers E_ACCESSDENIED,
 * checked on Windows 11 26100). So this helper opens its own window: invisible,
 * click-through, owned by the app window and laid over it, and anchors the
 * sheet there. The sheet itself is drawn by Explorer.
 *
 * stdout, one JSON object per line:
 *   {"type":"shown"}                      the sheet was asked to open
 *   {"type":"sheet","class":"…","pid":n}  the sheet's window was found (diagnostics)
 *   {"type":"chosen","app":"…"}           the user picked a target app
 *   {"type":"closed"}                     the sheet went away (done or dismissed)
 *   {"type":"error","code":"…","message":"…"}
 * Exit codes: 0 done; 2 bad arguments; 3 a file cannot be opened; 4 the share
 * UI failed. Closing stdin (the app quit) ends the helper at once.
 *
 * Build: build-win.mjs (in-box csc.exe + the Windows SDK's Windows.winmd), the
 * same way as packages/pdf2docx/ocr-helper/win-ocr.cs. Kept to C# 5.
 */
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Windows.ApplicationModel.DataTransfer;
using Windows.Storage;

[ComImport]
[Guid("3A3DCD6C-3EAB-43DC-BCDE-45671CE800C8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IDataTransferManagerInterop
{
    IntPtr GetForWindow([In] IntPtr appWindow, [In] ref Guid riid);
    void ShowShareUIForWindow(IntPtr appWindow);
}

/** The invisible window the sheet is anchored to: no taskbar button, clicks pass through. */
class Anchor : Form
{
    const int WS_EX_TOOLWINDOW = 0x80;
    const int WS_EX_TRANSPARENT = 0x20;
    const int WS_EX_LAYERED = 0x80000;

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            cp.ExStyle |= WS_EX_TOOLWINDOW | WS_EX_TRANSPARENT | WS_EX_LAYERED;
            return cp;
        }
    }
}

static class WinShare
{
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetClassName(IntPtr h, StringBuilder name, int size);
    [DllImport("dwmapi.dll")]
    static extern int DwmGetWindowAttribute(IntPtr h, int attribute, out int value, int size);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")]
    static extern IntPtr SetWindowLongPtr(IntPtr h, int index, IntPtr value);

    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left, Top, Right, Bottom; }

    const int GWLP_HWNDPARENT = -8;
    const int DWMWA_CLOAKED = 14;
    // the sheet looked gone: wait this long for a late "chosen" before leaving
    const int GONE_GRACE_MS = 2000;
    // IID of Windows.ApplicationModel.DataTransfer.IDataTransferManager
    static readonly Guid IID_DataTransferManager = new Guid("a5caee9b-8708-49d1-8d36-67d25a8da00c");
    // no sheet seen this long after asking: treat it as gone
    const int SHEET_APPEAR_MS = 60000;
    // after a target is chosen, stay up a little so the target can read the files
    const int AFTER_CHOSEN_MS = 15000;
    // never outlive this, whatever happens. The sheet is a normal window on Windows 11 (clicking
    // elsewhere leaves it open behind), so a person may come back to it a while later.
    const int MAX_LIFETIME_MS = 30 * 60 * 1000;

    static readonly object WriteLock = new object();
    // a winexe has no console, so Console.OutputEncoding cannot be set: write UTF-8 to the pipe
    static readonly System.IO.StreamWriter Out =
        new System.IO.StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));

    static void Emit(string json)
    {
        lock (WriteLock)
        {
            Out.Write(json + "\n");
            Out.Flush();
        }
    }

    static string Quote(string s)
    {
        var b = new StringBuilder("\"");
        foreach (char c in s ?? "")
        {
            if (c == '"' || c == '\\') b.Append('\\').Append(c);
            else if (c < 0x20) b.Append("\\u").Append(((int)c).ToString("x4"));
            else b.Append(c);
        }
        return b.Append('"').ToString();
    }

    static int Fail(int code, string kind, string message)
    {
        Emit("{\"type\":\"error\",\"code\":" + Quote(kind) + ",\"message\":" + Quote(message) + "}");
        return code;
    }

    [STAThread]
    static int Main(string[] args)
    {
        SetProcessDPIAware();

        long ownerValue;
        if (args.Length < 2 || !long.TryParse(args[0], out ownerValue))
            return Fail(2, "usage", "win-share.exe <owner-hwnd> <file> [<file> ...]");
        IntPtr owner = new IntPtr(ownerValue);

        var files = new List<IStorageItem>();
        for (int i = 1; i < args.Length; i++)
        {
            try
            {
                files.Add(StorageFile.GetFileFromPathAsync(args[i]).AsTask().Result);
            }
            catch (Exception e)
            {
                var inner = e is AggregateException && e.InnerException != null ? e.InnerException : e;
                return Fail(3, "file", args[i] + ": " + inner.Message);
            }
        }

        // the app quit (stdin closed): leave at once
        var watcher = new Thread(() =>
        {
            try { while (Console.In.ReadLine() != null) { } } catch { }
            Environment.Exit(0);
        });
        watcher.IsBackground = true;
        watcher.Start();

        var anchor = new Anchor
        {
            FormBorderStyle = FormBorderStyle.None,
            ShowInTaskbar = false,
            StartPosition = FormStartPosition.Manual,
            Opacity = 0,
            Bounds = AnchorBounds(owner),
        };
        int exitCode = 0;
        anchor.Load += (s, e) =>
        {
            if (IsWindow(owner)) SetWindowLongPtr(anchor.Handle, GWLP_HWNDPARENT, owner);
        };
        anchor.Shown += (s, e) =>
        {
            try
            {
                Show(anchor, owner, files);
            }
            catch (Exception ex)
            {
                exitCode = Fail(4, "share-ui", ex.Message);
                anchor.Close();
            }
        };
        Application.Run(anchor);
        return exitCode;
    }

    static Rectangle AnchorBounds(IntPtr owner)
    {
        RECT r;
        if (IsWindow(owner) && !IsIconic(owner) && GetWindowRect(owner, out r) && r.Right > r.Left)
            return new Rectangle(r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top);
        var screen = Screen.PrimaryScreen.WorkingArea;
        return new Rectangle(screen.Left + screen.Width / 4, screen.Top + screen.Height / 4,
            screen.Width / 2, screen.Height / 2);
    }

    /** The sheet window was destroyed, hidden, or cloaked (how Explorer puts it away). */
    static bool Gone(IntPtr sheet)
    {
        if (!IsWindow(sheet) || !IsWindowVisible(sheet)) return true;
        int cloaked;
        return DwmGetWindowAttribute(sheet, DWMWA_CLOAKED, out cloaked, 4) == 0 && cloaked != 0;
    }

    static void Show(Anchor anchor, IntPtr owner, List<IStorageItem> files)
    {
        var interop = (IDataTransferManagerInterop)WindowsRuntimeMarshal.GetActivationFactory(
            typeof(DataTransferManager));
        Guid iid = IID_DataTransferManager;
        var manager = (DataTransferManager)Marshal.GetObjectForIUnknown(
            interop.GetForWindow(anchor.Handle, ref iid));

        manager.DataRequested += (s, e) =>
        {
            var data = e.Request.Data;
            // the sheet refuses a package without a title
            data.Properties.Title = files[0].Name;
            data.SetStorageItems(files);
        };
        DateTime chosenAt = DateTime.MinValue;
        manager.TargetApplicationChosen += (s, e) =>
        {
            chosenAt = DateTime.UtcNow;
            Emit("{\"type\":\"chosen\",\"app\":" + Quote(e.ApplicationName) + "}");
        };

        // a sheet left open by an earlier share is foreground until the new one replaces it
        IntPtr stale = GetForegroundWindow();
        interop.ShowShareUIForWindow(anchor.Handle);
        Emit("{\"type\":\"shown\"}");

        uint self = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
        uint ownerPid = 0;
        if (IsWindow(owner)) GetWindowThreadProcessId(owner, out ownerPid);
        DateTime started = DateTime.UtcNow;
        IntPtr sheet = IntPtr.Zero;
        DateTime goneAt = DateTime.MinValue;
        var timer = new System.Windows.Forms.Timer { Interval = 250 };
        timer.Tick += (s, e) =>
        {
            double age = (DateTime.UtcNow - started).TotalMilliseconds;
            bool done;
            if (chosenAt != DateTime.MinValue)
                done = (DateTime.UtcNow - chosenAt).TotalMilliseconds > AFTER_CHOSEN_MS;
            else if (sheet == IntPtr.Zero)
            {
                // the sheet is the first foreground window that is neither ours nor the app's
                IntPtr fg = GetForegroundWindow();
                uint pid;
                GetWindowThreadProcessId(fg, out pid);
                if (fg != IntPtr.Zero && fg != stale && pid != self && pid != ownerPid && !Gone(fg))
                {
                    sheet = fg;
                    var cls = new StringBuilder(256);
                    GetClassName(fg, cls, 256);
                    Emit("{\"type\":\"sheet\",\"class\":" + Quote(cls.ToString()) + ",\"pid\":" + pid + "}");
                }
                done = sheet == IntPtr.Zero && age > SHEET_APPEAR_MS;
            }
            else
            {
                if (goneAt == DateTime.MinValue && Gone(sheet)) goneAt = DateTime.UtcNow;
                done = goneAt != DateTime.MinValue
                    && (DateTime.UtcNow - goneAt).TotalMilliseconds > GONE_GRACE_MS;
            }
            if (done || age > MAX_LIFETIME_MS)
            {
                timer.Stop();
                Emit("{\"type\":\"closed\"}");
                anchor.Close();
            }
        };
        timer.Start();
    }
}
