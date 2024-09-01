Projeto Controle de Vacinas
Descrição
Este projeto visa desenvolver um sistema para o gerenciamento e rastreamento de vacinas. O sistema permite o cadastro e login de usuários, gerenciamento de vacinas, e administração de informações relacionadas a dependentes e profissionais de saúde. Inclui também uma interface administrativa para criar, editar e deletar registros de usuários.

Funcionalidades
Cadastro e Login de Usuários: Permite que os usuários se cadastrem e façam login utilizando CPF e senha.
Gerenciamento de Vacinas: Usuários podem visualizar vacinas disponíveis por faixa etária, registrar vacinas tomadas e não tomadas.
Vinculação de Dependentes: Usuários podem adicionar dependentes e visualizar informações de vacinas para eles também.
Administração: Interface para admins criarem, editarem e deletarem usuários.
Busca de Usuários: Permite buscar usuários pelo CPF.
Tecnologias Utilizadas
Back-end: Node.js, Express
Banco de Dados: MySQL
Front-end: HTML, EJS, CSS
Validação de Formulário: JavaScript
Configuração do Ambiente
Clone o Repositório

bash
Copiar código
git clone <URL do repositório>
cd <diretório do repositório>
Instale as Dependências

bash
Copiar código
npm install
Configure o Banco de Dados

Crie um banco de dados no MySQL com o nome controle_vacinas.
Execute o script de criação de tabelas fornecido para configurar o banco de dados.
Configure as Credenciais do Banco de Dados

Edite o arquivo server.js para definir suas credenciais de banco de dados:

js
Copiar código
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sua_senha',
    database: 'controle_vacinas'
});
Inicie o Servidor

bash
Copiar código
npm start
O servidor será iniciado na porta 3000.

Endpoints Principais
Login do Usuário: /login
Cadastro de Usuário: /cadastrar
Gerenciar Usuários (Admin): /admin/usuarios
Lista de Vacinas: /lista-vacinas
Estrutura do Projeto
server.js: Arquivo principal do servidor, configurações e rotas.
views/: Contém os arquivos de visualização (EJS).
public/: Contém arquivos estáticos como CSS e JavaScript.
data/: Contém o arquivo JSON com dados de vacinas.
Contribuindo
Se você deseja contribuir para o projeto, por favor siga estas etapas:

Faça um fork do repositório.
Crie uma branch com sua feature ou correção.
Envie um pull request com uma descrição detalhada das mudanças.
Licença
Este projeto está licenciado sob a MIT License.

Contato
Se você tiver alguma dúvida ou precisar de ajuda, entre em contato pelo e-mail: seu-email@dominio.com.