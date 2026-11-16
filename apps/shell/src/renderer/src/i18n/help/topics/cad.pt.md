# Desenho IA

Desenho IA é uma aba para modelos 3D e desenhos simples. Abra um desenho que alguém enviou e confira as medidas, monte um modelo pequeno à mão ou pedindo à IA, e coloque uma folha de cotas em um documento do Hangul ou do Word. Os desenhos são salvos como arquivos .ttukcad, e todas as medidas de comprimento estão em milímetros.

## Abrir um desenho

- Para um desenho novo, vá à página inicial, abra **All apps** e clique em **Desenho IA**. A aba começa como **Desenho sem título**.
- Para abrir um arquivo, use **Arquivo › Abrir…** (Ctrl+O) ou arraste o arquivo para a janela. O Desenho IA abre arquivos .ttukcad, DXF, STL, OBJ, 3MF, GLB e PLY.
- Um arquivo que não é .ttukcad abre como um desenho novo sem título, com o nome do arquivo. O arquivo original nunca é alterado: ao salvar, sempre é pedido um novo arquivo .ttukcad.
- Arquivos DWG, STEP, IGES e BREP vêm de programas de CAD profissionais e não podem ser lidos. Nesse caso o Desenho IA mostra **Como abrir este arquivo**: peça a quem enviou um DXF (para um desenho 2D) ou um STL (para um modelo 3D).
- Um arquivo com mais de 100 MB, ou um modelo com mais de 2 milhões de triângulos, não abre.

## Colocar formas

- **Página inicial › Colocar formas** traz as quatro formas mais usadas; **Mais** abre a galeria com todas as 15: caixa, cilindro, esfera, cone, pirâmide, cunha, hemisfério, tubo, toro, prisma triangular, prisma hexagonal, caixa arredondada, prisma estrela, telhado e texto.
- Cada forma nova aparece no centro do plano de trabalho, a base onde o modelo fica apoiado. Clique em uma forma para selecioná-la; Shift+clique ou Ctrl+clique acrescenta outras formas à seleção.
- **Exibir › Alças** define o que as alças da forma selecionada fazem: **Mover**, **Girar** ou **Tamanho**. Ao arrastar, a forma anda em passos de 1 mm e 15°; segure Alt enquanto arrasta para desligar o encaixe.
- O painel **Propriedades** à direita mostra a forma selecionada: nome, tipo (sólido ou furo), tamanho, posição (mm), rotação (°) e cor. Digite um número para mudar o valor. **Ocultar** e **Bloquear** tiram uma forma do caminho.
- **Exibir › Vistas** vira a câmera para **Topo**, **Frente** ou **Lado**, e **Mostrar tudo** enquadra o modelo inteiro. Arraste na vista para girá-la e use a roda do mouse para aproximar ou afastar.
- A barra de status embaixo mostra o tamanho do plano de trabalho, o encaixe e a grade, além da largura × profundidade × altura da forma selecionada.

## Furos, grupos e alinhamento

- Um furo é uma forma que recorta. Selecione uma forma e clique em **Furo** (ou H) para transformá-la em furo; clique de novo para voltar a ser sólida.
- Um furo só recorta dentro de um grupo. Selecione o furo e os sólidos que ele deve recortar e clique em **Agrupar** (Ctrl+G): o grupo é o resultado dos sólidos menos os furos. **Desagrupar** (Ctrl+Shift+G) desfaz o grupo.
- **Alinhar** põe as formas selecionadas em linha com a primeira forma que você selecionou: esquerda, centro ou direita; frente, centro ou fundo; base, centro ou topo.
- Por exemplo, um cilindro de 80 mm de diâmetro e um cilindro-furo de 68 mm de diâmetro levantado 5 mm, selecionados juntos e agrupados, formam um copo com fundo de 5 mm.

## Desenhar à mão e texto

- **Desenhar à mão** traça um contorno do seu jeito. Clique no plano de trabalho para marcar pelo menos 3 pontos; **Desfazer ponto** remove o último.
- Informe a **Altura (mm)** e clique em **Fechar forma**: o contorno vira um sólido. **Cancelar** sai sem criar nada.
- Linhas que se cruzam não são aceitas. Desfaça pontos até que elas não se cruzem mais.
- **Texto** pede as palavras a colocar e as transforma em letras sólidas, com a fonte que vem com o GenOffice.

## Medir e a folha de cotas

- **Medir** mostra a distância entre dois pontos em que você clica, o comprimento de uma linha ou o diâmetro de um círculo. Os pontos se prendem a cantos, pontas de linhas e centros de círculos. Esc apaga a medida.
- **Folha de cotas** desenha o modelo de frente, de cima e de lado em uma folha A4, com a largura, a profundidade e a altura totais, uma escala que caiba (1:1, 1:2, 1:5, 1:10 …) e um carimbo com o nome, a data e a escala. Um desenho que veio de um arquivo DXF mostra só a vista de cima.
- Na folha, **Copiar imagem** coloca a folha na área de transferência. Cole-a em uma aba do Hangul, do Word ou do PowerPoint.
- **Enviar para o Hangul** abre um novo documento do Hangul com a folha e uma tabela das formas e seus tamanhos. Quando **Recursos de documentos coreanos** está desligado nas configurações, o botão passa a ser **Enviar para o Word** e cria um documento do Word.

## O assistente de IA

- O painel de IA ao lado do desenho coloca formas, muda tamanhos e posições, faz furos, agrupa, alinha, define o tamanho do plano de trabalho e resume o modelo. Alguns pedidos para testar:
  - "Faça um porta-lápis de 80 mm de largura e 100 mm de altura, oco por dentro com 68 mm de diâmetro"
  - "Transforme o plano de trabalho em uma sala de 5 × 4 m e coloque quatro mesas"
  - "Alinhe à esquerda as formas selecionadas"
- Tudo o que um pedido mudou volta com um único **Desfazer** (Ctrl+Z), não importa quantas formas ele tenha alterado.
- A IA recebe o seu pedido e um resumo do modelo (nome, tipo, tamanho e posição de cada forma). Ela não pode salvar, abrir, exportar nem enviar; isso fica com você.

## Salvar e recuperar

- **Salvar** (Ctrl+S) grava um arquivo .ttukcad. O Desenho IA só salva nesse formato; **Salvar como…** (Ctrl+Shift+S) escolhe um novo nome ou local.
- **Salvamento automático**, no topo, salva a cada 30 segundos e sempre que a janela perde o foco, assim que o desenho tem um arquivo próprio.
- Se o GenOffice fechar de repente, na próxima vez que abrir o desenho aparece em **Documentos com conteúdo não salvo**. Clique em **Restaurar** para recuperá-lo.

## Exportar

- **Arquivo › Exportar STL** e **Exportar OBJ** gravam o modelo para uma impressora 3D ou outro programa. **Exportar imagem (PNG)** salva o que a vista mostra, sobre um fundo claro.
- Uma exportação nunca substitui o arquivo de onde o desenho veio.

## Atalhos de teclado

| Teclas                 | O que faz                    |
| ---------------------- | ---------------------------- |
| Ctrl+Z                 | Desfazer                     |
| Ctrl+Y ou Ctrl+Shift+Z | Refazer                      |
| Ctrl+S                 | Salvar                       |
| Ctrl+A                 | Selecionar tudo              |
| Delete                 | Excluir                      |
| Ctrl+D                 | Duplicar                     |
| Ctrl+G                 | Agrupar                      |
| Ctrl+Shift+G           | Desagrupar                   |
| H                      | Furo ↔ sólido                |
| Teclas de seta         | Mover 1 mm (com Shift 10 mm) |
| Alt ao arrastar        | Desligar o encaixe           |

**Ajuda › Atalhos** mostra a mesma lista dentro da aba.

## O que ele não faz

- Abrir diretamente arquivos DWG, STEP, IGES ou BREP. Peça um DXF ou um STL no lugar.
- Restrições, histórico de projeto ou montagens como nos programas de CAD profissionais. Cada forma é definida pelos próprios números.
- Imprimir. Envie a folha de cotas para um documento do Hangul ou do Word e imprima de lá.
