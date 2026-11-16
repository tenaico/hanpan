# Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

Status: Hanpan is applying to SignPath Foundation's program for open-source projects (November 2026). Releases up to and including v0.20.2 are not signed. This page says so again on the first signed release.

## What is signed

- The Windows installer `Hanpan-Setup-<version>.exe` and the program files it installs that this project builds from this repository (`Hanpan.exe` and the helper programs under `resources\`).
- Only files built by the [Windows build workflow](../.github/workflows/windows-build.yml) on GitHub-hosted runners, from a commit on `main` of [tenaico/hanpan](https://github.com/tenaico/hanpan). Files built on a developer's PC are never signed.
- Third-party open-source files bundled in the installer (for example libraries and fonts) keep their own publishers' signatures, or stay unsigned when their projects publish none. They are listed with their licenses in [NOTICE](../NOTICE).

Every signing request is approved by hand, by one of the approvers below, for one release.

## Team roles

| Role                     | Who                                                                                                  | What they may do                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Committers and reviewers | [grapevine26](https://github.com/grapevine26), [leehun0720-hash](https://github.com/leehun0720-hash) | Change the source code. Changes from anyone else (pull requests) are reviewed by a committer before they are merged. |
| Approvers                | [grapevine26](https://github.com/grapevine26)                                                        | Approve each signing request.                                                                                        |

All team members use multi-factor authentication for GitHub and SignPath.

## Privacy

Hanpan has no server of its own and sends no usage statistics. Data leaves the PC only in the cases listed in the [privacy policy](../PRIVACY.md): AI requests the user starts go to the AI service the user connected; update checks go to GitHub; the Home screen's Trend Radar card fetches a public forecast from trend.tenai.kr, which stops when the card is removed. The installer shows the same list ("Information sent") before installing.

## Changes the installer makes to Windows

The installer adds Hanpan's command-line tool to the user's `PATH`, offers Hanpan in Explorer's "Open with" for the document types it opens, and adds Word, Excel and PowerPoint documents to Explorer's "New" menu. Uninstalling removes all of these.
