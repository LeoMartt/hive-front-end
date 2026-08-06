# Nome do Projeto

Projeto frontend desenvolvido com React, Vite e TypeScript.

## Tecnologias utilizadas

* React
* Vite
* TypeScript
* Bootstrap
* React Router
* Zod
* Axios
* SCSS

## Pré-requisitos

Antes de iniciar, é necessário ter instalado:

* Git
* Node.js
* npm
* Visual Studio Code, recomendado

Para verificar as instalações, execute no PowerShell:

```powershell
git --version
node --version
npm --version
```

## Clonar o projeto

No PowerShell, acesse a pasta onde deseja salvar o projeto:

```powershell
cd C:\caminho\para\seus\projetos
```

Clone o repositório:

```powershell
git clone https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
```

Entre na pasta do projeto:

```powershell
cd NOME-DO-REPOSITORIO
```

Abra o projeto no Visual Studio Code:

```powershell
code .
```

## Instalar as dependências

Na raiz do projeto, execute:

```powershell
npm install
```

Esse comando instala automaticamente todas as bibliotecas registradas no `package.json`, incluindo as dependências de desenvolvimento necessárias para executar o projeto.

As bibliotecas serão instaladas na pasta:

```text
node_modules/
```

Essa pasta não deve ser enviada para o GitHub, pois cada pessoa pode recriá-la executando `npm install`.

O arquivo `package-lock.json` deve ser mantido no repositório para que todos instalem versões compatíveis das dependências.

## Executar o projeto

Após instalar as dependências, execute:

```powershell
npm run dev
```

O terminal exibirá um endereço local semelhante a:

```text
http://localhost:5173
```

Abra esse endereço no navegador.

## Gerar a versão de produção

Para verificar os tipos e gerar a versão de produção:

```powershell
npm run build
```

Os arquivos gerados ficarão na pasta:

```text
dist/
```

## Visualizar a versão de produção

Depois de executar o build, use:

```powershell
npm run preview
```

## Atualizar o projeto local

Para baixar as alterações mais recentes do GitHub:

```powershell
git pull origin main
```

Depois, execute novamente:

```powershell
npm install
```

Isso é importante quando o `package.json` ou o `package-lock.json` tiver sido alterado por outro desenvolvedor.

## Estrutura principal

```text
src/
├── api/
├── assets/
├── components/
├── config/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── styles/
├── types/
├── utils/
└── validations/
```

### Responsabilidade das pastas

* `api/`: caminhos e endpoints da API.
* `assets/`: imagens, ícones, fontes e arquivos estáticos.
* `components/`: componentes visuais reutilizáveis.
* `config/`: configurações globais e bibliotecas.
* `hooks/`: hooks, chamadas da API e lógicas reutilizáveis.
* `layouts/`: estruturas compartilhadas entre páginas.
* `pages/`: páginas completas da aplicação.
* `routes/`: configuração das rotas com React Router.
* `styles/`: arquivos SCSS, personalizações do Bootstrap e cores.
* `types/`: tipos e interfaces TypeScript.
* `utils/`: funções auxiliares genéricas.
* `validations/`: schemas e validações com Zod.

## Padrões do projeto

* Utilizar Bootstrap como primeira opção para todo o design.
* Não utilizar CSS comum ou estilos inline.
* Utilizar SCSS quando o Bootstrap não atender à necessidade.
* Centralizar cores personalizadas em um arquivo de cores.
* Utilizar React Router para navegação.
* Utilizar Zod para validação de dados e formulários.
* Manter os endpoints da API na pasta `api/`.
* Manter chamadas da API e lógicas reutilizáveis na pasta `hooks/`.
* Manter todos os tipos TypeScript na pasta `types/`.
* Utilizar `export default function` em páginas e componentes React.
