/**
 * FRONTEND COMPLETO - script.js
 */

const URL_API = "https://script.google.com/macros/s/AKfycbxN08BWYIU54BBX38DaXr551fMyjdr0Meudq3SKr2EIvgFq9HugCkIqCi3C41vEjuzPwA/exec";

const corpoAgenda = document.getElementById('corpo-agenda');
const seletorData = document.getElementById('data');
const seletorMaquina = document.getElementById('maquina'); 
let reservasGlobais = {};
let selecoesTemporarias = new Set();

async function carregarReservas() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '<tr><td colspan="3">A carregar horários...</td></tr>';
    try {
        const response = await fetch(URL_API);
        reservasGlobais = await response.json();
        atualizarAgenda();
    } catch (e) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:red">Erro na conexão.</td></tr>';
    }
}

function atualizarAgenda() {
    const corpo = document.getElementById('corpo-agenda');
    const dataSel = document.getElementById('data').value;
    const maqSel = document.getElementById('maquina').value;

    if (!corpo || !dataSel || !maqSel) return;
    corpo.innerHTML = '';

    for (let hora = 7; hora <= 17; hora++) {
        const horaFormatada = hora.toString().padStart(2, '0') + ":00";
        const chave = `${dataSel}-${maqSel}-${horaFormatada}`;
        
        const ocupadoPor = reservasGlobais[chave];
        const marcado = selecoesTemporarias.has(chave);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${horaFormatada}</td>
            <td class="${ocupadoPor ? 'status-indisponivel' : 'status-disponivel'}">
                ${ocupadoPor ? 'Reservado por: ' + ocupadoPor : 'Disponível'}
            </td>
            <td>
                ${ocupadoPor ? '---' : `<input type="checkbox" name="selecionar-hora" ${marcado ? 'checked' : ''} value="${horaFormatada}" onchange="gerenciar(this, '${chave}')">`}
            </td>
        `;
        corpo.appendChild(tr);
    }
}

function gerenciar(cb, chaveCompleta) {
    cb.checked ? selecoesTemporarias.add(chaveCompleta) : selecoesTemporarias.delete(chaveCompleta);
}

async function reservarSelecionados() {
    const nome       = document.getElementById('nome').value.trim();
    const email      = document.getElementById('email').value.trim();
    const orientador = document.getElementById('orientador').value.trim();
    const projeto    = document.getElementById('projeto').value.trim();
    const senha      = document.getElementById('senha-lab').value.trim();
    const dataUso    = document.getElementById('data').value;
    const detalhes   = document.getElementById('maquina').value;

    if (!nome || !senha || selecoesTemporarias.size === 0) {
        return alert("Por favor, preencha o Nome, Senha e selecione pelo menos um horário.");
    }

    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true;
    btn.innerText = "A gravar...";

    const ID_UNICO = "ID-" + Date.now();

    // As chaves já estão completas no formato "data-maquina-hora"
    // Extraímos apenas as horas para exibir no WhatsApp
    const horasOrdenadas = Array.from(selecoesTemporarias)
        .map(ch => ch.split('-').pop())
        .sort();


    // Ensaios Mecânicos → aba "Prensas"; Caracterização e Aulas → aba "Reservas"
    const abaDestino = categoriaAtiva === 'ENSAIOS MECÂNICOS' ? 'Prensas' : 'Reservas';

    const payload = {
        action: 'reservar_lote',
        id: ID_UNICO,
        senha: senha,
        aba: abaDestino,
        usuario: {
            nome,
            email,
            orientador: orientador || "Não informado",
            projeto:    projeto    || "Não informado"
        },
        reservas: [{
            // Chave base sem a hora (data-maquina) — o backend adiciona a hora
            chave:   `${dataUso}-${detalhes}`,
            maquina: detalhes,
            horas:   horasOrdenadas
        }],
        data: dataUso
    };

    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        const respText = await response.text();

        if (respText.includes("Sucesso")) {
            alert("✅ Dados salvos com sucesso!");
            
            const horasTexto = horasOrdenadas.join(', ');
            let msg = `🔬 *Novo Agendamento LMP*\n\n`;
            msg += `*ID:* ${ID_UNICO}\n`;
            msg += `*Nome:* ${nome}\n`;
            msg += `*Orientador:* ${orientador || "Não informado"}\n`;
            msg += `*Projeto:* ${projeto || "Não informado"}\n`;
            msg += `*Ensaio:* ${detalhes}\n`;
            msg += `*Data:* ${dataUso}\n`;
            msg += `*Horas:* ${horasTexto}\n\n`;
            msg += `✅ *ACEITAR:* \n${URL_API}?id=${ID_UNICO}&acao=Aceito\n\n`;
            msg += `❌ *RECUSAR:* \n${URL_API}?id=${ID_UNICO}&acao=Recusado`;

            window.open(`https://wa.me/5585988179510?text=${encodeURIComponent(msg)}`, '_blank');
            location.reload(); 
        } else {
            alert("❌ Erro: " + respText);
        }
    } catch (e) {
        alert("Erro técnico ao conectar ao servidor.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Agendamento";
    }
}

// Listeners para atualizar a tabela conforme seleção
document.getElementById('data').addEventListener('change', atualizarAgenda);
