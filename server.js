const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Configuração do banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'joe123',
    database: 'controle_vacinas'
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados.');
});

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({
    secret: 'seu_segredo_aqui',
    resave: false,
    saveUninitialized: true
}));

// Rotas de login, cadastro, e dashboard
app.get('/login', (req, res) => res.render('login'));

app.get('/cadastro', (req, res) => res.render('cadastro'));
app.post('/cadastro', (req, res) => {
    const { nome, cpf, telefone, email, cartaoSUS, dataNascimento, senha, dependente, cpfGestor } = req.body;
    const hashedPassword = bcrypt.hashSync(senha, 10);

    let valid = true;
    let mensagem = '';

    // Validar nome completo
    if (!nome.includes(' ')) {
        mensagem += 'Nome completo deve ter pelo menos dois nomes.\n';
        valid = false;
    }

    // Validar CPF (deve ter 11 dígitos numéricos)
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpfLimpo)) {
        mensagem += 'CPF deve ter exatamente 11 números.\n';
        valid = false;
    }

    // Validar telefone (formato (xx)xxxx-xxxx ou (xx)xxxxx-xxxx)
    if (!/^\(\d{2}\)\d{4,5}-\d{4}$/.test(telefone)) {
        mensagem += 'Telefone deve estar no formato (xx)xxxx-xxxx ou (xx)xxxxx-xxxx.\n';
        valid = false;
    }

    // Validar senha
    if (!senha) {
        mensagem += 'Senha é obrigatória.\n';
        valid = false;
    }

    if (!valid) {
        return res.render('cadastro', { mensagem });
    }

    if (dependente) {
        db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpfGestor], (err, results) => {
            if (err) {
                console.error('Erro ao buscar gestor:', err);
                return res.status(500).send('Erro ao buscar gestor.');
            }
            if (results.length === 0) {
                return res.render('cadastro', { mensagem: 'Gestor não encontrado. Cadastro não realizado.' });
            }
            db.query('INSERT INTO usuarios (nome_completo, cpf, telefone, email, cartao_sus, data_nascimento, senha, gestor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                [nome, cpfLimpo, telefone, email, cartaoSUS, dataNascimento, hashedPassword, results[0].id], 
                (err) => {
                    if (err) {
                        console.error('Erro ao cadastrar dependente:', err);
                        return res.status(500).send('Erro ao cadastrar dependente.');
                    }
                    res.redirect('/login');
                }
            );
        });
    } else {
        db.query('INSERT INTO usuarios (nome_completo, cpf, telefone, email, cartao_sus, data_nascimento, senha) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [nome, cpfLimpo, telefone, email, cartaoSUS, dataNascimento, hashedPassword], 
            (err) => {
                if (err) {
                    console.error('Erro ao cadastrar usuário:', err);
                    return res.status(500).send('Erro ao cadastrar usuário.');
                }
                res.redirect('/login');
            }
        );
    }
});



app.post('/login', (req, res) => {
    const { cpf, senha } = req.body;
    db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf], async (err, results) => {
        if (err || results.length === 0) return res.status(401).send('CPF ou senha incorretos');
        const user = results[0];
        const validPassword = await bcrypt.compare(senha, user.senha);
        if (validPassword) {
            req.session.userId = user.id;
            res.redirect('/dashboard');
        } else {
            res.status(401).send('CPF ou senha incorretos');
        }
    });
});

app.get('/dashboard', (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    const vacinas = loadVacinas(); 
    res.render('dashboard', { vacinas });
});

// Função para carregar vacinas do JSON
function loadVacinas() {
    const filePath = path.join(__dirname, 'data', 'vacinas.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

// Rotas de dependentes
app.get('/gerenciar-dependentes', (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    db.query('SELECT * FROM usuarios WHERE gestor_id = ?', [userId], (err, dependentes) => {
        if (err) return res.status(500).send('Erro ao consultar dependentes.');

        res.render('gerenciar-dependentes', { dependentes });
    });
});


app.get('/vincular-dependentes', (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');
    res.render('vincular-dependentes', { mensagem: null });
});

app.post('/vincular-dependentes', (req, res) => {
    const { cpfDependente } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpfDependente], (err, results) => {
        if (err || results.length === 0) {
            return res.render('vincular-dependentes', { mensagem: 'Dependente não cadastrado.' });
        }
        db.query('UPDATE usuarios SET gestor_id = ? WHERE cpf = ?', [userId, cpfDependente], (err) => {
            if (err) return res.status(500).send('Erro ao vincular dependente.');
            res.redirect('/dashboard');
        });
    });
});


// Rota para listar todas as vacinas por faixa etária
app.get('/lista-vacinas', (req, res) => {
    const vacinas = loadVacinas(); // Carregar vacinas do arquivo JSON
    res.render('lista-vacinas', { vacinas });
});

// Função para carregar vacinas do JSON
function loadVacinas() {
    const filePath = path.join(__dirname, 'data', 'vacinas.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}



// Rota para remover dependente
app.post('/remover-dependente', (req, res) => {
    const { cpfDependente } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    db.query('SELECT * FROM usuarios WHERE cpf = ? AND gestor_id = ?', [cpfDependente, userId], (err, results) => {
        if (err) return res.status(500).send('Erro ao consultar dependente.');

        if (results.length === 0) {
            return res.status(404).send('Dependente não encontrado ou não pertence a você.');
        }

        // Exclui o dependente
        db.query('UPDATE usuarios SET gestor_id = NULL WHERE cpf = ?', [cpfDependente], (err) => {
            if (err) return res.status(500).send('Erro ao remover dependente.');
            res.redirect('/gerenciar-dependentes');
        });
    });
});










app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo deu errado!');
});
