/**
 * Hanpan design board: the AI helper on the right. Two modes: make a new
 * design from a description, or fill the design on the page (a template, or
 * one made before) with new words while its layout stays. The connect prompt,
 * the first-connection notice, the blocked notice, the composer and the model
 * picker are the shared parts every editor's AI panel uses; the state is
 * use-design-ai.ts, so the quick rewrite on the page goes through the same gate.
 */
import { useEffect, useRef } from 'react'
import type { Lang } from '@genoffice/i18n'
import {
  AiBlockedNotice,
  AiComposer,
  AiConnectPrompt,
  AiFirstConnectionNotice,
  AiModelPicker,
} from '@genoffice/ui'
import sendEnterOn from '../assets/send-enter-on.png'
import sendEnterOff from '../assets/send-enter-off.png'
import sendStop from '../assets/send-stop.png'
import { DESIGN_MOODS, fillSlots, type DesignMood } from './ai'
import { FORMATS, type DesignDoc } from './model'
import type { DesignAi, DesignAiMode } from './use-design-ai'
import type { Words } from './words'

export function DesignAiPanel(p: {
  lang: string
  w: Words
  ai: DesignAi
  doc: DesignDoc
  /** a text box changes focus here: the composer takes it when the panel opens for a fill */
  focusKey: number
}) {
  const { w, ai } = p
  const lang = p.lang as Lang
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = ai.busy !== null
  const slotCount = ai.mode === 'fill' ? fillSlots(p.doc).length : 0
  const statuses = ai.subscription.statuses

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [ai.thread, ai.live, ai.gate.connectChoice, ai.gate.noticeDue])

  useEffect(() => {
    if (p.focusKey) inputRef.current?.focus()
  }, [p.focusKey])

  const submit = () => {
    const text = ai.draft.trim()
    if (!text) return
    ai.send(
      ai.mode === 'make'
        ? { mode: 'make', text, format: ai.format, mood: ai.mood }
        : { mode: 'fill', text },
    )
  }

  const last = ai.thread[ai.thread.length - 1]
  return (
    <section className="dz-ai" data-hanpan="design-ai">
      <div className="dz-ai-modes" role="tablist">
        {(['make', 'fill'] as DesignAiMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={ai.mode === m}
            className={ai.mode === m ? 'on' : ''}
            disabled={busy}
            onClick={() => ai.setMode(m)}
            data-ai-mode={m}
          >
            {w.aiModes[m]}
          </button>
        ))}
      </div>
      {ai.mode === 'make' ? (
        <>
          <p className="dz-ai-intro">{w.aiMakeIntro}</p>
          <div className="dz-ai-opts">
            <label>
              <span>{w.aiFormat}</span>
              <select
                value={ai.format}
                disabled={busy}
                onChange={(e) => ai.setFormat(e.target.value)}
                data-hanpan="design-ai-format"
              >
                {FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {w.formats[f.id] ?? f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{w.aiMood}</span>
              <select
                value={ai.mood}
                disabled={busy}
                onChange={(e) => ai.setMood(e.target.value as DesignMood | 'auto')}
                data-hanpan="design-ai-mood"
              >
                <option value="auto">{w.aiAuto}</option>
                {DESIGN_MOODS.map((m) => (
                  <option key={m} value={m}>
                    {w.moods[m]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : (
        <p className="dz-ai-intro" data-hanpan="design-ai-fill-intro">
          {slotCount ? w.aiFillIntro(slotCount) : w.aiFillNone}
        </p>
      )}

      <div className="dz-ai-thread" ref={threadRef}>
        {ai.thread.length === 0 && (
          <div className="dz-ai-examples">
            {w.aiExamples[ai.mode].map((example) => (
              <button
                key={example}
                type="button"
                className="dz-ai-chip"
                onClick={() => {
                  ai.setDraft(example)
                  inputRef.current?.focus()
                }}
              >
                {example}
              </button>
            ))}
          </div>
        )}
        {ai.thread.map((turn) => (
          <div
            key={turn.id}
            className={`dz-ai-turn dz-ai-${turn.state}`}
            data-ai-turn={turn.mode}
            data-state={turn.state}
          >
            <p className="dz-ai-asked" dir="auto">
              {turn.label}
            </p>
            {turn.state === 'running' && (
              <div className="dz-ai-live" role="status">
                <span>{turn.mode === 'rewrite' ? w.aiRewriting : w.aiWriting}</span>
                {ai.live && <pre>{ai.live}</pre>}
              </div>
            )}
            {turn.blocked ? (
              <AiBlockedNotice
                kind={turn.blocked.kind}
                provider={turn.blocked.provider}
                resetsAt={turn.blocked.resetsAt}
                message={turn.error}
                settings={ai.settings ?? {}}
                // the continue button belongs to the run that just stopped, not to older ones
                statuses={turn === last && !busy ? statuses : {}}
                lang={lang}
                onContinueWith={ai.continueWith}
              />
            ) : (
              turn.error && (
                <p className="dz-ai-error" role="alert" data-hanpan="design-ai-error">
                  {turn.error}
                </p>
              )
            )}
            {turn.note && (
              <p className="dz-ai-note">
                <span>{turn.note}</span>
                {ai.undoableId === turn.id && (
                  <button
                    type="button"
                    className="ghost"
                    disabled={busy}
                    onClick={() => ai.undo(turn.id)}
                    data-action="design-ai-undo"
                  >
                    {w.aiUndoTurn}
                  </button>
                )}
              </p>
            )}
          </div>
        ))}
        {ai.error && !last?.error && (
          <p className="dz-ai-error" role="alert" data-hanpan="design-ai-error">
            {ai.error}
          </p>
        )}
        {ai.gate.connectChoice && (
          <AiConnectPrompt
            choice={ai.gate.connectChoice}
            statuses={statuses}
            lang={lang}
            disabled={ai.subscription.busy}
            attention={ai.gate.connectAttention}
            onOpenSettings={ai.modelBridge.openModelSettings}
            onInstall={ai.subscription.install}
            onUpdate={ai.subscription.update}
            onCancelLogin={ai.subscription.cancelLogin}
            onLogin={ai.subscription.login}
            onRecheck={ai.subscription.recheck}
            onAcceptMetered={ai.subscription.acceptMetered}
            onOpenInstallHelp={ai.subscription.openInstallHelp}
            onOpenConnectHelp={ai.subscription.openConnectHelp}
          />
        )}
        {ai.gate.noticeDue && (
          <AiFirstConnectionNotice
            lang={lang}
            codexKeepsHistory
            onAcknowledge={ai.gate.acknowledgeNotice}
          />
        )}
      </div>

      <AiComposer
        value={ai.draft}
        busy={busy}
        placeholder={ai.mode === 'make' ? w.aiPlaceholder : w.aiFillPlaceholder}
        ariaLabel={w.aiModes[ai.mode]}
        hintIdle=""
        hintBusy=""
        sendLabel={w.aiSend}
        stopLabel={w.aiStop}
        iconOnly
        footerStart={
          <AiModelPicker
            bridge={ai.modelBridge}
            lang={lang}
            subscriptionStatuses={statuses}
            onRefreshSubscriptions={ai.subscription.refresh}
          />
        }
        sendIconEnabled={<img src={sendEnterOn} alt="" aria-hidden />}
        sendIconDisabled={<img src={sendEnterOff} alt="" aria-hidden />}
        stopIcon={<img src={sendStop} alt="" aria-hidden />}
        textareaRef={inputRef}
        onChange={ai.setDraft}
        onSend={submit}
        onStop={ai.stop}
      />
      <p className="dz-muted dz-ai-foot">{w.aiHint}</p>
    </section>
  )
}
