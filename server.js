const express = require('express');
//const mysql = require('mysql');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10; // número de salt rounds

// Configurações do Express
const app = express();
const port = 3000;

// Configuração do banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'joe123',
    database: 'controle_vacinas'
});

db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados.');   
});



// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secreto',
    resave: false,
    saveUninitialized: true
}));



// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Função para carregar vacinas do arquivo JSON
const loadVacinas = () => {
    const filePath = path.join(__dirname, 'data', 'vacinas.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
};

// Rota para página de cadastro
app.get('/cadastro', (req, res) => {
    res.render('cadastro', { mensagem: req.query.mensagem });
});

// Rota para cadastro de usuário
app.post('/cadastro', (req, res) => {
    const { nome, cpf, telefone, email, cartaoSUS, dataNascimento, senha, dependente, cpfGestor } = req.body;
    const gestorId = dependente === 'true' ? cpfGestor : null;

    // Criptografar a senha antes de armazená-la
    bcrypt.hash(senha, 10, (err, hash) => { // saltRounds está definido aqui diretamente
        if (err) {
            console.error('Erro ao criptografar a senha:', err);
            return res.status(500).send('Erro interno do servidor');
        }

        db.query('INSERT INTO usuarios (nome_completo, cpf, telefone, email, cartao_sus, data_nascimento, senha, gestor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nome, cpf, telefone, email, cartaoSUS, dataNascimento, hash, gestorId], // Alterado hash aqui
            (err) => {
                if (err) {
                    console.error('Erro ao cadastrar usuário:', err);
                    return res.redirect('/cadastro?mensagem=Erro ao cadastrar usuário.');
                }
                res.redirect('/login');
            }
        );
    });
});

// Rota para página de login
app.get('/login', (req, res) => {
    res.render('login');
});

// Rota para login de usuário
app.post('/login', (req, res) => {
    const { cpf, senha } = req.body;

    // Consulta SQL para encontrar o usuário com o CPF fornecido
    const query = 'SELECT * FROM usuarios WHERE cpf = ?';

    db.query(query, [cpf], (err, results) => {
        if (err) {
            console.error('Erro na consulta ao banco de dados:', err);
            return res.status(500).send('Erro interno do servidor');
        }

        if (results.length === 0) {
            return res.status(401).send('CPF ou senha incorretos');
        }

        const usuario = results[0];

        // Comparar a senha fornecida com a senha criptografada
        bcrypt.compare(senha, usuario.senha, (err, match) => {
            if (err) {
                console.error('Erro ao comparar senhas:', err);
                return res.status(500).send('Erro interno do servidor');
            }

            if (!match) {
                return res.status(401).send('CPF ou senha incorretos');
            }

            // Login bem-sucedido
            req.session.usuarioId = usuario.id; // Correção do nome da chave da sessão
            res.redirect('/dashboard');
        });
    });
});

// Rota para dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.usuarioId) return res.redirect('/login'); // Correção do nome da chave da sessão

    res.render('dashboard');
});

// Rota para gerenciar dependentes
app.get('/gerenciar-dependentes', (req, res) => {
    if (!req.session.usuarioId) return res.redirect('/login'); // Correção do nome da chave da sessão

    db.query('SELECT * FROM usuarios WHERE gestor_id = ?', [req.session.usuarioId], (err, dependentes) => { // Correção do nome da chave da sessão
        if (err) {
            console.error('Erro ao consultar dependentes:', err);
            return res.status(500).send('Erro ao consultar dependentes.');
        }

        res.render('gerenciar-dependentes', { dependentes });
    });
});

// Rota para vincular dependentes
app.get('/vincular-dependentes', (req, res) => {
    res.render('vincular-dependentes', { mensagem: req.query.mensagem });
});


app.post('/vincular-dependentes', (req, res) => {
    const cpfDependente = req.body.cpfDependente;
    const cpfGestor = req.session.cpf;

    db.query('SELECT id FROM usuarios WHERE cpf = ?', [cpfDependente], (err, resultados) => {
        if (err) {
            console.error('Erro ao consultar dependente:', err);
            return res.redirect('/vincular-dependentes?mensagem=Erro ao vincular dependente.');
        }

        if (resultados.length > 0) {
            db.query('UPDATE usuarios SET gestor_id = (SELECT id FROM usuarios WHERE cpf = ?) WHERE cpf = ?', [cpfGestor, cpfDependente], (err) => {
                if (err) {
                    console.error('Erro ao vincular dependente:', err);
                    return res.redirect('/vincular-dependentes?mensagem=Erro ao vincular dependente.');
                }
                res.redirect('/vincular-dependentes?mensagem=Dependente vinculado com sucesso.');
            });
        } else {
            res.redirect('/vincular-dependentes?mensagem=Dependente não encontrado.');
        }
    });
});


// Rota para remover dependente
app.post('/remover-dependente', (req, res) => {
    const { dependenteCpf } = req.body;

    db.query('UPDATE usuarios SET gestor_id = NULL WHERE cpf = ?', [dependenteCpf], (err) => {
        if (err) {
            console.error('Erro ao remover dependente:', err);
            return res.status(500).send('Erro ao remover dependente.');
        }
        res.redirect('/gerenciar-dependentes');
    });
});

// Rota para exibir vacinas tomadas e não tomadas
// Rota para exibir vacinas do usuário
app.get('/vacinas-usuarios', (req, res) => {
    const faixaEtaria = req.query.faixaEtaria;

    // Consulta para obter as vacinas tomadas pelo usuário
    const vacinasTomadasQuery = `
        SELECT v.nome, v.protecao
        FROM vacinas_usuarios vu
        JOIN vacinas v ON vu.vacina_id = v.id
        WHERE vu.usuario_id = ?`;

    // Consulta para obter as vacinas disponíveis para a faixa etária selecionada
    const vacinasDisponiveisQuery = `
        SELECT nome, protecao
        FROM vacinas
        WHERE faixaEtaria = ?`;

    // Suponha que você tenha o ID do usuário armazenado em uma variável ou sessão
    const usuarioId = 1; // Substitua pelo ID do usuário real

    db.query(vacinasTomadasQuery, [usuarioId], (err, vacinasTomadas) => {
        if (err) throw err;

        db.query(vacinasDisponiveisQuery, [faixaEtaria], (err, vacinasDisponiveis) => {
            if (err) throw err;

            res.render('vacinas-usuarios', {
                vacinasTomadas: vacinasTomadas,
                vacinasDisponiveis: vacinasDisponiveis
            });
        });
    });
});



app.get('/lista-vacinas', (req, res) => {
    // Função para carregar vacinas do arquivo JSON
    const loadVacinas = () => {
        const filePath = path.join(__dirname, 'data', 'vacinas.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    };

    // Carregar vacinas do arquivo
    const vacinas = loadVacinas();

    // Agrupar vacinas por faixa etária
    const vacinasPorFaixa = vacinas.reduce((acc, vacina) => {
        const faixa = vacina.faixaEtaria;
        if (!acc[faixa]) {
            acc[faixa] = [];
        }
        acc[faixa].push(vacina);
        return acc;
    }, {});

    // Renderizar a view com as vacinas agrupadas por faixa etária
    res.render('lista-vacinas', { vacinasPorFaixa });
});

/// ROTAS ADMINS
app.get('/admin-login', (req, res) => {
    res.render('admin-login', { mensagem: null });
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM admins WHERE username = ? AND password = ?';
    
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            return res.status(500).send('Erro no servidor.');
        }
        
        if (results.length > 0) {
            // Se o login for bem-sucedido, você pode iniciar uma sessão aqui
            req.session.admin = results[0];
            res.redirect('/admin-dashboard'); // redireciona para o dashboard do admin
        } else {
            res.status(401).send('Nome de usuário ou senha incorretos.');
        }
    });
});



app.get('/admin-dashboard', (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin-login');
    }
    res.render('admin-dashboard');
});


app.get('/admin-logout', (req, res) => {
    req.session.destroy(err => {
        if (err) throw err;
        res.redirect('/admin-login');
    });
});



///// TELA CRUD admin

app.get('/admin/usuarios', (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin-login');
    }

    const query = 'SELECT * FROM usuarios';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('admin-usuarios', { usuarios: results });
    });
});


// Rota para criar um novo usuário
app.post('/admin/criar-usuario', (req, res) => {
    const { nome_completo, cpf, telefone, email, cartao_sus, data_nascimento, senha } = req.body;
    const sql = `
        INSERT INTO usuarios (nome_completo, cpf, telefone, email, cartao_sus, data_nascimento, senha)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const valores = [nome_completo, cpf, telefone, email, cartao_sus, data_nascimento, senha];

    db.query(sql, valores, (err, result) => {
        if (err) {
            console.error('Erro ao criar usuário:', err);
            return res.status(500).send('Erro no servidor.');
        }
        res.redirect('/admin/usuarios');
    });
});


// Rota para pesquisar usuário por CPF
app.post('/admin/pesquisar-usuario', (req, res) => {
    const cpf = req.body.cpf;

    db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf], (error, results) => {
        if (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).send('Erro no servidor.');
            return;
        }
        res.render('admin-usuarios', { usuarios: results });
    });
});




// Rota para editar um usuário existente
app.post('/admin/editar-usuario/:id', (req, res) => {
    const { id } = req.params;
    const { nome_completo, telefone, email, cartao_sus, data_nascimento } = req.body;
    const sql = `
        UPDATE usuarios SET nome_completo = ?, telefone = ?, email = ?, cartao_sus = ?, data_nascimento = ?
        WHERE id = ?
    `;
    const valores = [nome_completo, telefone, email, cartao_sus, data_nascimento, id];

    db.query(sql, valores, (err, result) => {
        if (err) {
            console.error('Erro ao editar usuário:', err);
            return res.status(500).send('Erro no servidor.');
        }
        res.redirect('/admin/usuarios');
    });
});


// Rota para deletar um usuário
// Deletar usuário

app.post('/admin/deletar-usuario/:id', (req, res) => {
    const userId = req.params.id;

    // Usando a variável 'db' para a conexão
    db.query('DELETE FROM usuarios WHERE id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Erro ao deletar o usuário:', error);
            res.status(500).send('Erro no servidor.');
            return;
        }
        res.redirect('/admin/usuarios');
    });
});



// Rota para exibir a página de administração
app.get('/admin-vacinas', (req, res) => {
    const cpf = req.query.cpf;
    
    if (cpf) {
        // Buscar usuário pelo CPF
        db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf], (err, results) => {
            if (err) {
                console.error('Erro ao buscar usuário:', err);
                return res.status(500).send('Erro no servidor.');
            }
            
            const usuario = results[0];
            
            // Buscar todas as vacinas
            db.query('SELECT * FROM vacinas', (err, vacinas) => {
                if (err) {
                    console.error('Erro ao buscar vacinas:', err);
                    return res.status(500).send('Erro no servidor.');
                }
                
                res.render('admin-vacinas', {
                    usuario: usuario || null, // Garantir que usuario não seja undefined
                    vacinas: vacinas,
                    feedback: null, // Adicionar valores padrão
                    error: null // Adicionar valores padrão
                });
            });
        });
    } else {
        res.render('admin-vacinas', {
            usuario: null, // Garantir que usuario seja definido
            vacinas: [],
            feedback: null, // Adicionar valores padrão
            error: null // Adicionar valores padrão
        });
    }
});




// Rota para adicionar vacinas
app.post('/admin-vacinas', (req, res) => {
    const { usuario_id, vacina_id, data_tomada, dose, proxima_dose } = req.body;
    
    const query = 'INSERT INTO vacinas_usuarios (usuario_id, vacina_id, data_tomada, dose, proxima_dose) VALUES (?, ?, ?, ?, ?)';
    const values = [usuario_id, vacina_id, data_tomada, dose, proxima_dose || null];
    
    db.query(query, values, (err) => {
        if (err) {
            console.error('Erro ao adicionar vacina:', err);
            res.render('admin-vacinas', {
                usuario: { id: usuario_id }, // Fornecer um objeto usuário básico para não quebrar a renderização
                vacinas: [], // Atualize conforme necessário
                error: 'Erro ao adicionar vacina',
                feedback: null
            });
        } else {
            res.render('admin-vacinas', {
                usuario: { id: usuario_id }, // Fornecer um objeto usuário básico para não quebrar a renderização
                vacinas: [], // Atualize conforme necessário
                feedback: 'Vacina adicionada com sucesso',
                error: null
            });
        }
    });
});







// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
