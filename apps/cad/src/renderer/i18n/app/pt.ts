import type { zh } from './zh'

export const pt = {
  untitled: 'Desenho sem título',
  saved: 'Salvo',
  unsaved: 'Não salvo',
  noWebGlTitle: 'Não é possível mostrar a vista 3D',
  noWebGlBody:
    'Este PC não conseguiu iniciar o WebGL, necessário para a vista 3D. O desenho ainda abre e salva, mas não pode ser exibido. Tente uma destas opções e reabra a guia:',
  noWebGlDriver: 'Atualize o driver da placa de vídeo.',
  noWebGlAccel: 'Ative a aceleração de hardware nas configurações gráficas.',
  noticeNotOk:
    'Não foi possível abrir este arquivo como desenho. Ele pode estar danificado ou ter sido criado por uma versão mais nova. Um desenho vazio está aberto; ao salvar, será pedido um novo arquivo.',
  noticeTooLarge:
    'Este arquivo é grande demais para abrir (limite: 100 MB). Um desenho vazio está aberto.',
  noticeUnreadable: 'Não foi possível ler este arquivo. Um desenho vazio está aberto.',
  noticeUnsupported:
    'Este tipo de arquivo não pode ser aberto aqui. São abertos arquivos .ttukcad, .dxf, .stl, .obj, .3mf, .glb e .ply.',
  noticeImportFailed: 'Não foi possível ler as formas deste arquivo. Um desenho vazio está aberto.',
  saveRefused:
    'Não foi possível salvar o desenho. Suas alterações continuam aqui; tente novamente ou use Salvar como.',
  saveFailed:
    'Algo deu errado ao salvar o desenho. Suas alterações continuam aqui; tente novamente ou use Salvar como.',
  guideTitle: 'Como abrir este arquivo',
  guideBody:
    'Arquivos {ext} são criados por programas de CAD profissionais, e o Desenho IA não consegue lê-los.',
  guideAsk:
    'Peça a quem enviou que o salve novamente como DXF (para um desenho 2D) ou STL (para um modelo 3D) e envie esse arquivo. Ambos abrem aqui.',
  exportEmpty: 'Não há nada para exportar. Mostre pelo menos uma forma e tente novamente.',
  exportFailed: 'Não foi possível exportar o arquivo. Tente novamente ou escolha outra pasta.',
  exportSourcePath:
    'Uma exportação não pode substituir o arquivo de origem deste desenho. Escolha outro nome.',
  issueOpenMesh: 'Não é possível calcular este grupo: ele contém uma malha aberta',
  issueTooLarge: 'Triângulos demais para mostrar (limite de 2 milhões)',
  editLocked: 'Esta peça está bloqueada. Desbloqueie-a para alterá-la.',
  editNotScalable:
    'Esta peça não pode ser redimensionada com a alça. Malhas importadas, desenhos, grupos e texto só podem ser movidos e girados.',
  editRefused: 'Não foi possível fazer essa alteração. O desenho não mudou.',
} satisfies Record<keyof typeof zh, string>
