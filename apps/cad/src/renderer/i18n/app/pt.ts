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
    'Este tipo de arquivo não pode ser aberto aqui. São abertos arquivos .ttukcad, .dxf, .stl e .obj.',
  noticeImportFailed: 'Não foi possível ler as formas deste arquivo. Um desenho vazio está aberto.',
  saveRefused:
    'Não foi possível salvar o desenho. Suas alterações continuam aqui; tente novamente ou use Salvar como.',
  saveFailed:
    'Algo deu errado ao salvar o desenho. Suas alterações continuam aqui; tente novamente ou use Salvar como.',
} satisfies Record<keyof typeof zh, string>
