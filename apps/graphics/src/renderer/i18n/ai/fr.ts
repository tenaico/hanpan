import type { zh } from './zh'

export const fr = {
  aiOpenAssistant: "Ouvrir l'assistant IA",
  aiCollapsePanel: 'Réduire le panneau',
  aiNewChat: 'Nouvelle conversation',
  aiHintIdle: 'Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne',
  aiHintBusy: 'Réponse en cours…',
  aiSend: 'Envoyer',
  aiStop: 'Arrêter',
  aiThinking: 'Réflexion',
  aiWorking: 'Traitement',
  aiGroupWorking: 'En cours…',
  aiWorkedSteps: 'Terminé · {n} étapes',
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
  aiEmptyTitle: "Modifier avec l'IA",
  aiEmptyBody:
    "Dites à l'IA ce qu'il faut changer dans cette image. Elle passe par les commandes de l'application, et une seule annulation reprend tout ce qu'une demande a changé.",
  aiComposerPlaceholder: "Dites à l'IA ce qu'il faut changer…",
  aiEmptyPhoto: "Par exemple : « Supprime l'arrière-plan », « Éclaircis un peu »",
  aiEmptyIllust:
    'Par exemple : « Dessine un rectangle arrondi au centre », « Exporte le logo en PNG »',
  aiUndoAll: 'Annuler',
  aiUndoTitle: 'Annuler tout ce que cette demande a changé',
  aiUndone: "Annulé : le document est revenu à son état d'avant cette demande.",
  aiUndoChangedSince:
    "Le document a changé depuis, il ne peut pas être annulé en une fois. Utilisez l'annulation de l'application (Ctrl+Z).",
  aiUndoOverflow:
    "Cette demande a fait plus de changements que l'historique de l'application n'en garde : impossible de tout annuler en une fois.",
  aiUndoFailed:
    "Tout n'a pas pu être annulé. Utilisez l'annulation de l'application (Ctrl+Z) pour revenir plus loin.",
  aiBusyNotice: "Vous ne pouvez pas modifier le document pendant que l'IA travaille.",
  aiToolFind: 'Commandes recherchées',
  aiToolDescribe: 'Commande lue',
  aiToolRun: 'Commande exécutée',
  aiToolRunMany: 'Commandes exécutées',
  aiToolInspect: 'Document lu',
  aiToolExport: 'Copie exportée',
  aiToolGuide: 'Guide lu',
  aiAttachTitle: 'Joindre des fichiers locaux (ou faites-les glisser sur le panneau)',
  aiRemoveAttachmentTitle: 'Supprimer la pièce jointe',
  aiImageReadFail: '{name} : échec de la lecture',
  aiTooManyImages: 'Au plus {max} images par message ; les images en trop ont été ignorées',
  aiSumReadAttachment: 'Lire la pièce jointe',
  aiSumImageAttachment: 'Pièce jointe image {name}',
  aiSumReadAttachmentName: 'Lire la pièce jointe {name}',
  aiAttachNoVision:
    "Le modèle actuel ne voit pas les images : les images jointes n'ont pas été envoyées ; les fichiers texte sont toujours lus",
} satisfies Record<keyof typeof zh, string>
