import type { zh } from './zh'

export const fr = {
  aiOpenAssistant: "Ouvrir l'assistant IA",
  aiCollapsePanel: 'Réduire le panneau',
  aiNewChat: 'Nouvelle conversation',
  aiEmptyTitle: 'Dessiner avec l’IA',
  aiEmptyBody:
    'Décrivez ce qu’il faut faire, par exemple « un pot à crayons de 80 de large et 100 de haut, évidé à l’intérieur avec un trou de 68 ». Une demande est une seule étape : Ctrl+Z l’annule entièrement.',
  aiComposerPlaceholder: 'Dites à l’IA quoi créer ou modifier…',
  aiHintIdle: 'Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne',
  aiHintBusy: 'Réponse en cours…',
  aiSend: 'Envoyer',
  aiStop: 'Arrêter',
  aiThinking: 'Réflexion',
  aiWorking: 'Traitement',
  aiGroupWorking: 'En cours…',
  aiWorkedSteps: 'Terminé · étapes : {n}',
  aiStopped: 'Arrêté',
  aiNoReply: '(aucune réponse)',
  aiTurnLimit:
    "Limite d'étapes atteinte pour cette exécution — envoyez une autre instruction pour continuer.",
  aiTruncatedNote: '(La réponse a été tronquée par la limite de longueur et peut être incomplète.)',
  aiUndelivered: 'Non envoyé',
  aiRetry: 'Réessayer',
  aiCopyReplyTitle: 'Copier la réponse',
  aiRegenerateTitle: 'Régénérer',
  aiUnknownError: 'La requête IA a échoué, réessayez',
  aiTimeoutError: 'Délai de réponse IA dépassé',
  aiCreditsExhausted: 'Crédits épuisés — rechargez auprès de votre fournisseur d’IA',
  aiNetworkError:
    'Problème réseau : impossible de joindre le service IA. Vérifiez votre connexion et réessayez',
  aiOverloadedError: "Le service d'IA est actuellement surchargé — réessayez dans un instant",
  // the quick actions above the input
  aiQuickActions: 'Actions rapides',
  aiQuickSheet: 'Créer un plan coté',
  aiQuickRoom: 'Commencer l’aménagement d’une pièce',
  aiQuickRoomPrompt: 'Fais du plan de travail une pièce de 5 × 4 m et places-y 4 bureaux',
  // the steps of a reply: what each drawing tool did
  aiToolReadModel: 'Lire le dessin',
  aiToolAddShapes: 'Placer des formes · {n}',
  aiToolUpdateShapes: 'Modifier des formes · {n}',
  aiToolDeleteShapes: 'Supprimer des formes · {n}',
  aiToolGroupShapes: 'Grouper des formes',
  aiToolUngroupShapes: 'Dissocier',
  aiToolAlignShapes: 'Aligner des formes · {n}',
  aiToolSetWorkplane: 'Redimensionner le plan de travail',
  aiToolRefused: '{action} · refusé',
} satisfies Record<keyof typeof zh, string>
