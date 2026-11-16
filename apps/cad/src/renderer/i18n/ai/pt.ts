import type { zh } from './zh'

export const pt = {
  aiOpenAssistant: 'Abrir assistente de IA',
  aiCollapsePanel: 'Recolher painel',
  aiNewChat: 'Nova conversa',
  aiEmptyTitle: 'Desenhar com IA',
  aiEmptyBody:
    'Descreva o que quer fazer, por exemplo "um porta-lápis com 80 de largura e 100 de altura, oco por dentro com um furo de 68". Um pedido é um único passo: Ctrl+Z desfaz tudo de uma vez.',
  aiComposerPlaceholder: 'Diga à IA o que criar ou alterar…',
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
  // the quick actions above the input
  aiQuickActions: 'Ações rápidas',
  aiQuickSheet: 'Criar uma folha de cotas',
  aiQuickRoom: 'Começar o layout de um cômodo',
  aiQuickRoomPrompt: 'Transforme o plano de trabalho em um cômodo de 5 × 4 m e coloque 4 mesas',
  // the steps of a reply: what each drawing tool did
  aiToolReadModel: 'Ler o desenho',
  aiToolAddShapes: 'Colocar formas · {n}',
  aiToolUpdateShapes: 'Alterar peças · {n}',
  aiToolDeleteShapes: 'Excluir peças · {n}',
  aiToolGroupShapes: 'Agrupar peças',
  aiToolUngroupShapes: 'Desagrupar',
  aiToolAlignShapes: 'Alinhar peças · {n}',
  aiToolSetWorkplane: 'Redimensionar o plano de trabalho',
  aiToolRefused: '{action} · recusado',
} satisfies Record<keyof typeof zh, string>
