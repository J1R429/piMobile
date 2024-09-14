# Projeto de Controle de Vacinas

Este é um projeto para um aplicativo de controle de vacinas. Ele inclui funcionalidades para cadastro e gerenciamento de usuários, bem como rastreamento das vacinas tomadas e a serem tomadas.

## Estrutura do Projeto

### Backend

- **Tecnologia**: Node.js com Express
- **Banco de Dados**: MySQL
- **Arquitetura**: MVC (Model-View-Controller)

### Frontend

- **Tecnologia**: HTML, CSS e EJS (Embedded JavaScript Templates)
- **Estilo**: CSS separado em arquivos

## Funcionalidades

1. **Cadastro e Login de Usuário**
   - Cadastro com nome completo, CPF, telefone, e-mail, cartão SUS, data de nascimento e senha.
   - Login com CPF e senha.

2. **Gerenciamento de Usuários (Admin)**
   - Criar, editar e deletar usuários.
   - Pesquisar usuários pelo CPF.

3. **Controle de Vacinas**
   - Listar vacinas disponíveis por faixa etária.
   - Marcar vacinas tomadas e visualizar vacinas pendentes.
   - Adicionar dependentes e gerenciar as vacinas deles.

4. **Funcionalidades de Pesquisa**
   - Buscar usuários pelo CPF.

## Estrutura de Diretórios

- `/css/` - Contém arquivos de estilo CSS.
  - `global.css` - Estilos gerais aplicados a todo o projeto.
  - `admin-usuarios.css` - Estilos específicos para cada página de administração de usuários.
  - `responsivo.css` - Estilos para tornar o site responsivo em dispositivos móveis.

- `/js/` - Contém scripts JavaScript.
  - `validacao.js` - Validações de formulário no lado do cliente.

- `/views/` - Contém os arquivos EJS para renderização das páginas.
  - `admin-usuarios.ejs` - Página para administração e gerenciamento de usuários.
  - `login.ejs` - Página de login.
  - `dashboard.ejs` - Página principal do usuário.
  - `vincular-dependentes.ejs` - Página para vincular dependentes.

- `/data/` - Contém arquivos JSON.
  - `vacinas.json` - Dados das vacinas.

## Instruções de Configuração

1. **Instalar Dependências**

   ```bash
   npm install

2. **Configurar o Banco de Dados**

- Crie um banco de dados MySQL e configure as tabelas necessárias conforme o esquema fornecido.

3. **Rodar o Servidor**

    ```bash
    npm start

4. **Acessar o Aplicativo**

- Abra um navegador e acesse http://localhost:3000.

**Licença**

Este projeto está licenciado sob a MIT License.