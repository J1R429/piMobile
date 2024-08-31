const express = require('express');
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
app.get('/vacinas-usuarios', (req, res) => {
    const usuarioId = req.session.usuarioId;

    if (!usuarioId) {
        return res.redirect('/login');
    }

    db.query(`
        SELECT v.nome, vu.data_tomada, vu.dose
        FROM vacinas v
        JOIN vacinas_usuarios vu ON v.id = vu.vacina_id
        WHERE vu.usuario_id = ?
    `, [usuarioId], (err, vacinasTomadas) => {
        if (err) {
            console.error("Erro ao consultar vacinas tomadas:", err);
            return res.render('erro', { mensagem: "Erro ao consultar vacinas." });
        }

        db.query(`
            SELECT v.nome
            FROM vacinas v
            LEFT JOIN vacinas_usuarios vu ON v.id = vu.vacina_id AND vu.usuario_id = ?
            WHERE vu.vacina_id IS NULL
        `, [usuarioId], (err, vacinasNaoTomadas) => {
            if (err) {
                console.error("Erro ao consultar vacinas não tomadas:", err);
                return res.render('erro', { mensagem: "Erro ao consultar vacinas." });
            }

            res.render('vacinas-usuarios', {
                vacinasTomadas: vacinasTomadas,
                vacinasNaoTomadas: vacinasNaoTomadas
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





// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
