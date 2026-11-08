import type { zh } from './zh'

export const pt = {
  aiOpenAssistant: 'Abrir assistente de IA',
  aiCollapsePanel: 'Recolher painel',
  aiNewChat: 'Nova conversa',
  aiHintIdle: 'Enter para enviar, Shift+Enter para nova linha',
  aiHintBusy: 'Respondendo…',
  aiSend: 'Enviar',
  aiStop: 'Parar',
  aiThinking: 'Pensando',
  aiWorking: 'Trabalhando',
  aiGroupWorking: 'Em andamento…',
  aiWorkedSteps: 'Concluído · {n} etapas',
  aiStopped: 'Parado',
  aiNoReply: '(sem resposta)',
  aiTurnLimit: 'Limite de etapas por execução atingido — envie outra instrução para continuar.',
  aiTruncatedNote: '(A resposta foi cortada pelo limite de comprimento e pode estar incompleta.)',
  aiUndelivered: 'Não enviado',
  aiRetry: 'Tentar novamente',
  aiCopyReplyTitle: 'Copiar resposta',
  aiRegenerateTitle: 'Gerar novamente',
  aiUnknownError: 'A solicitação de IA falhou, tente novamente',
  aiTimeoutError: 'A resposta da IA expirou',
  aiCreditsExhausted: 'Créditos esgotados — recarregue com o seu provedor de IA',
  aiNetworkError:
    'Problema de rede: não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente',
  aiOverloadedError:
    'O serviço de IA está sobrecarregado no momento — tente novamente em instantes',
  aiEmptyTitle: 'Editar com IA',
  aiEmptyBody:
    'Diga à IA o que mudar nesta imagem. Ela trabalha com os comandos do aplicativo, e um único Desfazer reverte tudo o que uma solicitação mudou.',
  aiComposerPlaceholder: 'Diga à IA o que mudar…',
  aiEmptyPhoto: 'Por exemplo: "Remova o fundo", "Deixe um pouco mais clara"',
  aiEmptyIllust:
    'Por exemplo: "Desenhe um retângulo arredondado no centro", "Exporte o logotipo como PNG"',
  aiUndoAll: 'Desfazer',
  aiUndoTitle: 'Desfazer tudo o que esta solicitação mudou',
  aiUndone: 'Desfeito: o documento voltou a como estava antes desta solicitação.',
  aiUndoChangedSince:
    'O documento mudou depois disso, então não dá para desfazer em um passo. Use o Desfazer do aplicativo (Ctrl+Z).',
  aiUndoOverflow:
    'Esta solicitação fez mais mudanças do que o histórico do aplicativo guarda, então não dá para desfazer em um passo.',
  aiUndoFailed:
    'Não foi possível desfazer tudo. Use o Desfazer do aplicativo (Ctrl+Z) para voltar mais.',
  aiBusyNotice: 'Você não pode editar o documento enquanto a IA trabalha.',
  aiToolFind: 'Comandos pesquisados',
  aiToolDescribe: 'Comando lido',
  aiToolRun: 'Comando executado',
  aiToolRunMany: 'Comandos executados',
  aiToolInspect: 'Documento lido',
  aiToolExport: 'Cópia exportada',
  aiToolGuide: 'Guia lido',
} satisfies Record<keyof typeof zh, string>
