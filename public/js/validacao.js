document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form');

    form.addEventListener('submit', function (event) {
        console.log('Validação iniciada');
        const nome = document.getElementById('nome').value.trim();
        const cpf = document.getElementById('cpf').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const senha = document.getElementById('senha').value.trim();

        let valid = true;
        let mensagem = '';

        // Verificar se o nome completo contém pelo menos um espaço
        if (!nome.includes(' ')) {
            mensagem += 'Nome completo deve ter pelo menos dois nomes (ou seja, conter um espaço).\n';
            valid = false;
        }

        // Validar CPF (deve ter 11 dígitos numéricos)
        const cpfLimpo = cpf.replace(/\D/g, ''); // Remove caracteres não numéricos
        if (!/^\d{11}$/.test(cpfLimpo)) {
            mensagem += 'CPF deve ter exatamente 11 números.\n';
            valid = false;
        }

        // Validar telefone (formato (xx)xxxx-xxxx ou (xx)xxxxx-xxxx)
        if (!/^\(\d{2}\)\d{4,5}-\d{4}$/.test(telefone)) {
            mensagem += 'Telefone deve estar no formato (xx)xxxx-xxxx ou (xx)xxxxx-xxxx.\n';
            valid = false;
        }

        // Validar senha (não pode estar vazia)
        if (!senha) {
            mensagem += 'Senha é obrigatória.\n';
            valid = false;
        }

        if (!valid) {
            alert(mensagem);
            event.preventDefault(); // Impede o envio do formulário
        }
    });
});
