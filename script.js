document.addEventListener("DOMContentLoaded", function () {
  const content = document.getElementById("content");
  let fichasTecnicasSalvas = [];

  const {
    db,
    auth,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
  } = window.firebase;

  // --- LÓGICA DE DADOS COM FIRESTORE ---
  async function carregarDadosDoFirestore() {
    const user = auth.currentUser;
    if (!user) {
      fichasTecnicasSalvas = [];
      mostrarMenuFichaTecnica();
      return;
    }
    try {
      const q = query(
        collection(db, "fichasTecnicas"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      fichasTecnicasSalvas = [];
      querySnapshot.forEach((doc) => {
        fichasTecnicasSalvas.push({ id: doc.id, ...doc.data() });
      });
      mostrarMenuFichaTecnica();
    } catch (error) {
      console.error("Erro ao carregar fichas técnicas: ", error);
    }
  }
  window.carregarDadosDoFirestore = carregarDadosDoFirestore;

  async function salvarDadosFichaTecnica() {
    const user = auth.currentUser;
    if (!user) {
      alert("Você precisa estar logado para salvar.");
      return;
    }

    const novaFicha = coletarDadosDoFormulario();
    if (!novaFicha.nome) {
      alert("Por favor, preencha o Nome da Preparação.");
      return;
    }

    novaFicha.userId = user.uid;

    try {
      await addDoc(collection(db, "fichasTecnicas"), novaFicha);
      alert("Ficha Técnica salva com sucesso!");
      await carregarDadosDoFirestore();
    } catch (error) {
      console.error("Erro ao salvar ficha: ", error);
      alert("Ocorreu um erro ao salvar a ficha.");
    }
  }

  async function salvarDadosEdicao(index) {
    const user = auth.currentUser;
    const fichaParaAtualizar = fichasTecnicasSalvas[index];
    if (
      !user ||
      !fichaParaAtualizar ||
      user.uid !== fichaParaAtualizar.userId
    ) {
      alert("Você não tem permissão para editar esta ficha.");
      return;
    }

    const fichaAtualizada = coletarDadosDoFormulario();
    if (!fichaAtualizada.nome) {
      alert("Por favor, preencha o Nome da Preparação.");
      return;
    }

    try {
      const fichaRef = doc(db, "fichasTecnicas", fichaParaAtualizar.id);
      await updateDoc(fichaRef, fichaAtualizada);
      alert("Ficha Técnica atualizada com sucesso!");
      await carregarDadosDoFirestore();
    } catch (error) {
      console.error("Erro ao atualizar ficha: ", error);
      alert("Ocorreu um erro ao atualizar a ficha.");
    }
  }

  // --- NAVEGAÇÃO E EVENTOS ---
  document.getElementById("fichaTecnicaMenu").addEventListener("click", (e) => {
    e.preventDefault();
    mostrarMenuFichaTecnica();
  });

  function mostrarMenuFichaTecnica() {
    content.innerHTML = `<h2>Ficha Técnica</h2><button id="inserirFicha">Inserir</button><button id="excluirFicha">Excluir</button><div id="listaFichasTecnicas"></div>`;
    renderizarListaFichas();
  }

  function renderizarListaFichas() {
    const container = document.getElementById("listaFichasTecnicas");
    container.innerHTML = "<h3>Fichas Técnicas Salvas</h3>";
    if (fichasTecnicasSalvas.length === 0) {
      container.innerHTML += "<p>Nenhuma ficha técnica foi criada ainda.</p>";
      return;
    }
    fichasTecnicasSalvas.forEach((ficha, index) => {
      const card = document.createElement("div");
      card.className = "ficha-card clickable";
      card.setAttribute("data-index", index);
      card.innerHTML = `<h4>${ficha.nome}</h4><p>Tipo: ${ficha.tipo}</p>`;
      container.appendChild(card);
    });
  }

  content.addEventListener("click", function (event) {
    const target = event.target;
    const targetId = target.id;
    if (targetId === "inserirFicha") mostrarFormularioFichaTecnica();
    if (targetId === "addInsumo") adicionarLinhaInsumo();
    if (targetId === "salvarFicha") salvarDadosFichaTecnica();
    if (targetId === "voltarParaLista") mostrarMenuFichaTecnica();
    if (targetId === "editarFicha") {
      const index = target.dataset.index;
      mostrarFormularioFichaTecnica(fichasTecnicasSalvas[index], index);
    }
    if (targetId === "salvarEdicao") {
      const index = target.dataset.index;
      salvarDadosEdicao(index);
    }
    const cardClicado = target.closest(".ficha-card.clickable");
    if (cardClicado) {
      const index = cardClicado.dataset.index;
      if (fichasTecnicasSalvas[index])
        mostrarDetalhesFicha(fichasTecnicasSalvas[index], index);
    }
  });

  // --- FUNÇÕES DE VISUALIZAÇÃO, FORMULÁRIO E CÁLCULOS ---
  function mostrarDetalhesFicha(ficha, index) {
    let insumosHtml = "";
    (ficha.insumos || []).forEach((insumo) => {
      insumosHtml += `<tr><td>${insumo.produto || ""}</td><td>${
        insumo.qtdBruta || "0"
      } ${insumo.unidadeQtd || ""}</td><td>${insumo.valorUnitario || "0"} / ${
        insumo.unidadePreco || ""
      }</td><td>R$ ${insumo.custo || "0.00"}</td></tr>`;
    });
    const custosFixos = ficha.custosFixos || {};
    const totalCustosFixos = Object.values(custosFixos).reduce(
      (acc, valor) => acc + (parseFloat(valor) || 0),
      0
    );
    content.innerHTML = `<div class="ficha-view-container"><div class="ficha-header"><h2>${
      ficha.nome
    }</h2><p>${
      ficha.tipo
    }</p></div><div class="ficha-section"><h3>Ingredientes</h3><table class="view-table"><thead><tr><th>Produto/Insumo</th><th>Quantidade Bruta</th><th>Valor Unitário</th><th>Custo</th></tr></thead><tbody>${insumosHtml}</tbody><tfoot><tr><td colspan="4">${
      ficha.valoresCalculados.totalInsumos
    }</td></tr></tfoot></table></div><div class="ficha-section"><h3>Modo de Preparo</h3><div class="modo-preparo-view">${
      ficha.modoPreparo || "Nenhum modo de preparo informado."
    }</div></div><div class="ficha-section"><h3>Análise Financeira</h3><div class="financial-summary"><div class="summary-box"><h4>Resumo de Custos</h4><div class="summary-item"><span>Custo Total de Insumos</span><strong>${
      ficha.valoresCalculados.totalInsumos
    }</strong></div><div class="summary-item"><span>Custos Fixos da Receita</span><strong>R$ ${totalCustosFixos.toFixed(
      2
    )}</strong></div><div class="summary-item"><span>CUSTO TOTAL</span><strong>${
      ficha.valoresCalculados.custoPreparacao
    }</strong></div></div><div class="summary-box"><h4>Preço de Venda</h4><div class="summary-item"><span>Rendimento</span><strong>${
      ficha.rendimento || 0
    } porções</strong></div><div class="summary-item"><span>Custo por Porção</span><strong>${
      ficha.valoresCalculados.custoPorcao
    }</strong></div><div class="summary-item"><span>Margem de Lucro</span><strong>${
      ficha.margemLucro || 0
    }%</strong></div><div class="summary-item"><span>PREÇO PORÇÃO</span><strong>${
      ficha.valoresCalculados.precoVendaPorcao
    }</strong></div></div></div></div><div class="details-actions"><button id="editarFicha" class="btn-primary" data-index="${index}">Editar Ficha</button><button id="voltarParaLista" class="btn-secondary">Voltar</button></div></div>`;
  }

  function mostrarFormularioFichaTecnica(ficha = {}, index = null) {
    const isEditing = index !== null;
    const titulo = isEditing ? `Editando: ${ficha.nome}` : "Nova Ficha Técnica";
    const botaoSalvarId = isEditing ? "salvarEdicao" : "salvarFicha";
    const botaoSalvarTexto = isEditing
      ? "Salvar Alterações"
      : "Salvar Ficha Técnica";
    const dataIndex = isEditing ? `data-index="${index}"` : "";
    let insumosHtml = "";
    (ficha.insumos || []).forEach((insumo) => {
      insumosHtml += `<tr><td><input type="text" class="form-input" value="${
        insumo.produto || ""
      }"></td><td><select class="form-input">${getOpcoesUnidadeHtml(
        insumo.unidadeQtd
      )}</select></td><td><input type="number" class="form-input" value="${
        insumo.qtdBruta || ""
      }"></td><td><input type="number" class="form-input" value="${
        insumo.qtdLiquida || ""
      }"></td><td><input type="number" class="form-input" value="${
        insumo.fatorCorrecao || ""
      }"></td><td><select class="form-input">${getOpcoesUnidadeHtml(
        insumo.unidadePreco
      )}</select></td><td><input type="number" class="form-input" value="${
        insumo.valorUnitario || ""
      }"></td><td><input type="number" class="form-input" value="${
        insumo.custo || "0.00"
      }" disabled></td></tr>`;
    });

    // --- CÓDIGO HTML CORRIGIDO DENTRO DESTA FUNÇÃO ---
    content.innerHTML = `
            <h2>${titulo}</h2>
            <div class="form-container">
                <div class="form-section">
                    <h3>Informações Gerais</h3>
                    <label for="nomePreparacao">Nome da Preparação:</label>
                    <input type="text" id="nomePreparacao" class="form-input" value="${
                      ficha.nome || ""
                    }">
                    <label for="tipoPreparacao">Tipo:</label>
                    <select id="tipoPreparacao" class="form-input">
                        <option value="Aperitivo" ${
                          ficha.tipo === "Aperitivo" ? "selected" : ""
                        }>Aperitivo</option>
                        <option value="Prato Principal" ${
                          ficha.tipo === "Prato Principal" ? "selected" : ""
                        }>Prato Principal</option>
                        <option value="Sobremesa" ${
                          ficha.tipo === "Sobremesa" ? "selected" : ""
                        }>Sobremesa</option>
                    </select>
                </div>
                <div class="form-section">
                    <h3>Lista de Insumos</h3>
                    <table class="insumos-table">
                        <thead>
                           <tr>
                                <th>Produto/Insumo</th><th>Un. (Qtd)</th><th>Qtd. Bruta</th><th>Qtd. Líquida</th>
                                <th>Fator Correção</th><th>Un. (Preço)</th><th>Valor Unit. (R$)</th><th>Custo (R$)</th>
                            </tr>
                        </thead>
                        <tbody id="insumosBody">${insumosHtml}</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="7" style="text-align: right; font-weight: bold;">Custo Total de Insumos:</td>
                                <td id="totalInsumosCost" style="font-weight: bold;">R$ 0.00</td>
                            </tr>
                        </tfoot>
                    </table>
                    <button id="addInsumo" class="btn-secondary">+ Adicionar Insumo</button>
                </div>
                <div class="form-section">
                    <h3>Modo de Preparo</h3>
                    <textarea id="modoPreparo" class="form-input" rows="6">${
                      ficha.modoPreparo || ""
                    }</textarea>
                    <label for="rendimento">Rendimento total da receita (em porções):</label>
                    <input type="number" id="rendimento" class="form-input calc-global-trigger" value="${
                      ficha.rendimento || ""
                    }" placeholder="Ex: 10">
                </div>
                <div class="form-section">
                    <h3>Análise de Custos</h3>
                    <label>Água (R$):</label><input type="number" id="custoAgua" class="form-input custo-fixo calc-global-trigger" value="${
                      ficha.custosFixos?.agua || ""
                    }" placeholder="0.00">
                    <label>Energia (R$):</label><input type="number" id="custoEnergia" class="form-input custo-fixo calc-global-trigger" value="${
                      ficha.custosFixos?.energia || ""
                    }" placeholder="0.00">
                    <label>Internet (R$):</label><input type="number" id="custoInternet" class="form-input custo-fixo calc-global-trigger" value="${
                      ficha.custosFixos?.internet || ""
                    }" placeholder="0.00">
                    <label>Mão de Obra (R$):</label><input type="number" id="custoMaoDeObra" class="form-input custo-fixo calc-global-trigger" value="${
                      ficha.custosFixos?.maoDeObra || ""
                    }" placeholder="0.00">
                    <label>Embalagem (R$):</label><input type="number" id="custoEmbalagem" class="form-input custo-fixo calc-global-trigger" value="${
                      ficha.custosFixos?.embalagem || ""
                    }" placeholder="0.00">
                    <hr>
                    <p><strong>Custo Total da Preparação:</strong> <span id="custoPreparacaoTotal">R$ 0.00</span></p>
                    <p><strong>Custo por Porção:</strong> <span id="custoPorcao">R$ 0.00</span></p>
                    <p><strong>CMV (Custo de Mercadoria Vendida):</strong> 0%</p>
                    <label for="margemLucro">Margem de Lucro (%):</label>
                    <input type="number" id="margemLucro" class="form-input calc-global-trigger" value="${
                      ficha.margemLucro || ""
                    }" placeholder="0">
                    <p><strong>Preço Sugerido (Total da Receita):</strong> <span id="precoSugeridoVendaTotal">R$ 0.00</span></p>
                    <p><strong>Preço Sugerido (Porção):</strong> <span id="precoSugeridoVendaPorcao">R$ 0.00</span></p>
                </div>
                <button id="${botaoSalvarId}" class="btn-primary" ${dataIndex}>${botaoSalvarTexto}</button>
            </div>
        `;
    document.querySelectorAll("#insumosBody tr").forEach((row) => {
      row.querySelectorAll("input, select").forEach((el) => {
        el.addEventListener("input", () => calcularCustoLinha(row));
        el.addEventListener("change", () => calcularCustoLinha(row));
      });
    });
    document.querySelectorAll(".calc-global-trigger").forEach((trigger) => {
      trigger.addEventListener("input", atualizarCustosGlobais);
    });
    if (isEditing) {
      atualizarCustosGlobais();
    }
  }

  function adicionarLinhaInsumo() {
    const tableBody = document.getElementById("insumosBody");
    const newRow = tableBody.insertRow();
    newRow.innerHTML = `<td><input type="text" class="form-input"></td><td><select class="form-input">${getOpcoesUnidadeHtml(
      "g"
    )}</select></td><td><input type="number" class="form-input" placeholder="0.00"></td><td><input type="number" class="form-input" placeholder="0.00"></td><td><input type="number" class="form-input" placeholder="0.00"></td><td><select class="form-input">${getOpcoesUnidadeHtml(
      "kg"
    )}</select></td><td><input type="number" class="form-input" placeholder="0.00"></td><td><input type="number" class="form-input" placeholder="0.00" disabled></td>`;
    newRow.querySelectorAll("input, select").forEach((trigger) => {
      trigger.addEventListener("input", () => calcularCustoLinha(newRow));
      trigger.addEventListener("change", () => calcularCustoLinha(newRow));
    });
  }

  function coletarDadosDoFormulario() {
    const insumos = [];
    document.querySelectorAll("#insumosBody tr").forEach((row) => {
      const cells = row.querySelectorAll(".form-input, select");
      insumos.push({
        produto: cells[0].value,
        unidadeQtd: cells[1].value,
        qtdBruta: cells[2].value,
        qtdLiquida: cells[3].value,
        fatorCorrecao: cells[4].value,
        unidadePreco: cells[5].value,
        valorUnitario: cells[6].value,
        custo: cells[7].value,
      });
    });
    return {
      nome: document.getElementById("nomePreparacao").value,
      tipo: document.getElementById("tipoPreparacao").value,
      modoPreparo: document.getElementById("modoPreparo").value,
      rendimento: document.getElementById("rendimento").value,
      custosFixos: {
        agua: document.getElementById("custoAgua").value,
        energia: document.getElementById("custoEnergia").value,
        internet: document.getElementById("custoInternet").value,
        maoDeObra: document.getElementById("custoMaoDeObra").value,
        embalagem: document.getElementById("custoEmbalagem").value,
      },
      margemLucro: document.getElementById("margemLucro").value,
      insumos: insumos,
      valoresCalculados: {
        totalInsumos: document.getElementById("totalInsumosCost").textContent,
        custoPreparacao: document.getElementById("custoPreparacaoTotal")
          .textContent,
        custoPorcao: document.getElementById("custoPorcao").textContent,
        precoVendaTotal: document.getElementById("precoSugeridoVendaTotal")
          .textContent,
        precoVendaPorcao: document.getElementById("precoSugeridoVendaPorcao")
          .textContent,
      },
    };
  }

  function getOpcoesUnidadeHtml(valorSelecionado = "kg") {
    const opcoes = [
      { valor: "kg", texto: "Kg (Quilograma)" },
      { valor: "g", texto: "g (Grama)" },
      { valor: "l", texto: "L (Litro)" },
      { valor: "ml", texto: "ml (Mililitro)" },
      { valor: "un", texto: "UN (Unidade)" },
    ];
    return opcoes
      .map(
        (op) =>
          `<option value="${op.valor}" ${
            op.valor === valorSelecionado ? "selected" : ""
          }>${op.texto}</option>`
      )
      .join("");
  }

  function calcularCustoLinha(row) {
    const inputs = row.querySelectorAll(".form-input, select");
    const unQtd = inputs[1].value,
      qtdBruta = parseFloat(inputs[2].value) || 0,
      unPreco = inputs[5].value,
      valorUnitario = parseFloat(inputs[6].value) || 0;
    const campoCusto = inputs[7];
    const fatoresParaBase = { kg: 1, g: 0.001, l: 1, ml: 0.001, un: 1 };
    const qtdNaBase = qtdBruta * fatoresParaBase[unQtd],
      precoNaBase = valorUnitario / fatoresParaBase[unPreco];
    const massa = ["kg", "g"],
      volume = ["l", "ml"];
    const incompativel =
      (massa.includes(unQtd) && volume.includes(unPreco)) ||
      (volume.includes(unQtd) && massa.includes(unPreco)) ||
      (unQtd === "un" && unPreco !== "un") ||
      (unPreco === "un" && unQtd !== "un");
    campoCusto.value =
      incompativel || !valorUnitario || !qtdBruta
        ? "0.00"
        : (qtdNaBase * precoNaBase).toFixed(2);
    atualizarCustosGlobais();
  }

  function atualizarCustosGlobais() {
    let totalInsumos = 0;
    document.querySelectorAll("#insumosBody tr").forEach((row) => {
      totalInsumos +=
        parseFloat(row.cells[7].querySelector("input").value) || 0;
    });
    document.getElementById(
      "totalInsumosCost"
    ).textContent = `R$ ${totalInsumos.toFixed(2)}`;
    let custosFixos = 0;
    document.querySelectorAll(".custo-fixo").forEach((input) => {
      custosFixos += parseFloat(input.value) || 0;
    });
    const custoPreparacao = totalInsumos + custosFixos;
    document.getElementById(
      "custoPreparacaoTotal"
    ).textContent = `R$ ${custoPreparacao.toFixed(2)}`;
    const rendimento =
      parseInt(document.getElementById("rendimento").value) || 0;
    const custoPorcao = rendimento > 0 ? custoPreparacao / rendimento : 0;
    document.getElementById(
      "custoPorcao"
    ).textContent = `R$ ${custoPorcao.toFixed(2)}`;
    const margemLucro =
      parseFloat(document.getElementById("margemLucro").value) || 0;
    const precoSugeridoTotal =
      margemLucro < 100 && margemLucro >= 0
        ? custoPreparacao / (1 - margemLucro / 100)
        : 0;
    const precoSugeridoPorcao =
      rendimento > 0 ? precoSugeridoTotal / rendimento : 0;
    document.getElementById(
      "precoSugeridoVendaTotal"
    ).textContent = `R$ ${precoSugeridoTotal.toFixed(2)}`;
    document.getElementById(
      "precoSugeridoVendaPorcao"
    ).textContent = `R$ ${precoSugeridoPorcao.toFixed(2)}`;
  }
});
