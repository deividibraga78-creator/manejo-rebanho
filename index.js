
// --- IMPORTAÇÕES ---
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Evita que o build da Vercel/Web quebre por causa do pacote nativo
let WebBrowser = null;
if (Platform.OS !== 'web') {
  WebBrowser = require('expo-web-browser');
  WebBrowser.maybeCompleteAuthSession();
}

// --- CONEXÃO COM O BANCO DE DADOS (SUPABASE) ---
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bonhkjxiujzewagjizsr.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eXQWjpoahbmM8tJDULkcsA_TC96ttWP'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // Memórias do formulário de entrada (Cadastro)
  const [idEmEdicao, setIdEmEdicao] = useState(null);
  const [brinco, setBrinco] = useState('');
  const [raca, setRaca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [pesoEntrada, setPesoEntrada] = useState('');
  const [precoKgCompra, setPrecoKgCompra] = useState('');
  const [dataEntrada, setDataEntrada] = useState(''); 
  const [custoDiario, setCustoDiario] = useState('');
  const [piqueManejo, setPiqueManejo] = useState('Campo');
  
  // --- ESTADO PARA MEDICAMENTOS ---
  const [medicamentos, setMedicamentos] = useState([{ id: Math.random().toString(), nome: '', data: '', carencia: '' }]);

  // --- ESTADOS DO FORMULÁRIO DE SAÍDA (VENDA) ---
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const [pesoSaida, setPesoSaida] = useState('');
  const [precoKgVenda, setPrecoKgVenda] = useState(''); 
  const [dataSaida, setDataSaida] = useState(''); 

  // --- ESTADO DE CUSTOS GLOBAIS DE MANEJO (RATEIO) ---
  const [descricaoManejo, setDescricaoManejo] = useState('');
  const [custoManejoGlobal, setCustoManejoGlobal] = useState('');
  const [dataManejoGlobal, setDataManejoGlobal] = useState(''); 
  const [tipoAlvoRateio, setTipoAlvoRateio] = useState('Todos'); 

  // --- LISTA DE ANIMAIS ---
  const [animais, setAnimais] = useState([]);

  // --- ESTADOS DE FILTROS AVANÇADOS ---
  const [filtroSetor, setFiltroSetor] = useState('Todos'); // 'Todos', 'Campo', 'Confinamento', 'Vendidos'
  const [filtroDataCorte, setFiltroDataCorte] = useState(''); // Filtro de data limite de gastos

  // --- FUNÇÃO AUXILIAR PARA ALERTAS ---
  const exibirAlerta = (titulo, mensagem) => {
    if (Platform.OS === 'web') {
      alert(`${titulo}: ${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
  };

  // --- CARREGAR DADOS AO INICIAR ---
 // --- FUNÇÃO PARA PUXAR OS DADOS DA NUVEM CORRETAMENTE ---
  async function carregarDadosOnline() {
    try {
      const { data, error } = await supabase
        .from('dados_rebanho')
        .select('lista_animais')
        .eq('id', 1) // Garante que só vai ler a primeira linha
        .maybeSingle();

      if (error) throw error;

      if (data && data.lista_animais) {
        // Se os dados vierem como texto/string, transforma em lista real
        const lista = typeof data.lista_animais === 'string' 
          ? JSON.parse(data.lista_animais) 
          : data.lista_animais;
        
        setAnimais(Array.isArray(lista) ? lista : []);
      } else {
        setAnimais([]);
      }
    } catch (e) {
      console.log("Erro ao carregar dados do Supabase", e);
    }
  }

  useEffect(() => {
    carregarDadosOnline();
  }, []);
// --- ESCUTADOR DE AUTENTICAÇÃO (SUPABASE) ---
  useEffect(() => {
    // Escuta se o usuário logou ou deslogou (Funciona no Celular e na Web)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setEstaLogado(true);
      } else {
        setEstaLogado(false);
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // // --- ESCUTADOR DE AUTENTICAÇÃO (SUPABASE) ---
  useEffect(() => {
    // Escuta se o usuário logou ou deslogou (Funciona no Celular e na Web)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setEstaLogado(true);
      } else {
        setEstaLogado(false);
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // --- FUNÇÃO DE LOGIN PADRÃO (ADMIN) ---
  const realizarLogin = () => {
    if (usuarioInput.trim() === 'admin' && senhaInput === 'admin') {
      setEstaLogado(true); 
    } else {
      exibirAlerta('Erro de Acesso', 'Usuário ou senha incorretos.');
    }
  };

  // --- FUNÇÃO DE LOGIN COM GOOGLE ---
  const loginComGoogle = async () => {
    try {
      const redirectUrl = 'https://bonhkjxiujzewagjizsr.supabase.co/auth/v1/callback'; 
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS === 'web' ? true : false,
        },
      });

      if (error) throw error;

      if (Platform.OS !== 'web' && data?.url && WebBrowser) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          setEstaLogado(true);
        }
      }
    } catch (error) {
      exibirAlerta('Erro Google Auth', error.message || 'Não foi possível conectar.');
    }
  };
// Garante que o aplicativo busca os dados assim que liga
useEffect(() => {
  carregarDadosOnline();
}, []);

  // --- FUNÇÃO PARA SALVAR AUTOMATICAMENTE NO SUPABASE ---
  const salvarDadosLocais = async (novaLista) => {
    // Atualiza a tela primeiro para o usuário ver os animais na hora
    setAnimais(novaLista);
    
    try {
      // Pega o último animal adicionado na lista para enviar ao banco
      if (novaLista.length > 0) {
        const ultimoAnimal = novaLista[novaLista.length - 1];

        // Envia para a tabela 'dados_rebanho' que vimos na image_3aea77.png
        const { error } = await supabase
          .from('dados_rebanho')
          .insert([{ lista_animais: ultimoAnimal }]);

        if (error) {
          console.log("Erro ao enviar para o Supabase:", error.message);
        } else {
          console.log("Dados sincronizados com sucesso na nuvem!");
        }
      }
    } catch (e) {
      console.log("Erro na conexão com o banco", e);
    }
  };

  // --- FUNÇÃO AUXILIAR: CONVERSOR DE DATAS SEGURO ---
  function tratarData(txtData) {
    if (!txtData) return new Date();
    try {
      const limparTexto = txtData.trim();
      if (limparTexto.includes('/')) {
        const [dia, mes, ano] = limparTexto.split('/').map(Number);
        return new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T12:00:00`);
      }
      if (limparTexto.includes('-')) {
        const parts = limparTexto.split('-');
        if (parts[0].length === 4) {
          return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`);
        } else {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
      }
    } catch (err) {
      console.log("Erro formato data", err);
    }
    return new Date();
  }

  // --- CALCULAR MÉTRICAS DO ANIMAL COM SUPORTE A FILTRO DE DATA ---
  const calcularMetricasAnimal = (ani, dataVendaFim = null, dataCorteFiltro = null) => {
    const pesoIn = parseFloat(ani.pesoEntrada) || 0;
    const pCompra = parseFloat(ani.precoCompra) || 0;
    const cDiario = parseFloat(ani.custoDiario) || 0;
    
    // 1. Calcular o rateio histórico filtrado (se houver filtro de data)
    let rateioAcumulado = 0;
    const historico = ani.historicoRateios || [];
    historico.forEach(r => {
      if (dataCorteFiltro) {
        const dataR = tratarData(r.dataOriginalCusto);
        const dataC = tratarData(dataCorteFiltro);
        if (dataR.getTime() <= dataC.getTime()) {
          rateioAcumulado += parseFloat(r.valor) || 0;
        }
      } else {
        rateioAcumulado += parseFloat(r.valor) || 0;
      }
    });

    // 2. Definir a data final para cálculo dos dias de trato
    const dSaida = dataVendaFim || ani.dataSaida;
    const dateIn = tratarData(ani.dataEntrada);
    
    let dateOut = tratarData(dSaida || ani.dataEntrada);
    if (dataCorteFiltro) {
      const dataC = tratarData(dataCorteFiltro);
      if (dataC.getTime() < dateOut.getTime()) {
        dateOut = dataC;
      }
    }

    const diferencaTempo = dateOut.getTime() - dateIn.getTime();
    const dias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));
    const diasFinais = isNaN(dias) || dias < 0 ? 0 : dias;

    const pSaida = parseFloat(dataVendaFim ? pesoSaida : ani.pesoSaida) || 0;
    const ganhoPesoTotal = pSaida - pesoIn;
    const gpdCalculado = diasFinais > 0 ? (ganhoPesoTotal / diasFinais) : 0;
    const totalTratoCalculado = diasFinais * cDiario;

    const pVenda = dataVendaFim ? (pSaida * (parseFloat(precoKgVenda) || 0)) : (parseFloat(ani.precoVenda) || 0);
    const custoTotalAteMomento = pCompra + totalTratoCalculado + rateioAcumulado;
    const lucroLiq = pVenda - custoTotalAteMomento;

    return {
      diasCocho: diasFinais,
      gpd: gpdCalculado,
      totalTrato: totalTratoCalculado,
      lucroLiquido: lucroLiq,
      precoVenda: pVenda,
      custoTotalAcumulado: custoTotalAteMomento,
      apenasRateios: rateioAcumulado
    };
  };

  // --- DISTRIBUIR CUSTOS GLOBAIS ---
  const distribuirCustosGlobais = () => {
    const valorTotal = parseFloat(custoManejoGlobal);
    if (!descricaoManejo || !dataManejoGlobal) {
      exibirAlerta('Atenção', 'Informe a descrição e a data do lançamento do custo.');
      return;
    }
    if (isNaN(valorTotal) || valorTotal <= 0) {
      exibirAlerta('Atenção', 'Insira um valor de custo válido.');
      return;
    }
    if (animais.length === 0) {
      exibirAlerta('Atenção', 'Não há bovinos cadastrados.');
      return;
    }

    const dataLimiteCusto = tratarData(dataManejoGlobal);

    const animaisAlvo = animais.filter(ani => {
      const atendeManejo = tipoAlvoRateio === 'Todos' || ani.piqueManejo === tipoAlvoRateio;
      const dataEntradaBovino = tratarData(ani.dataEntrada);
      const jaEstavaCadastrado = dataEntradaBovino.getTime() <= dataLimiteCusto.getTime();
      const naoEstavaVendido = ani.status !== 'Vendido' || (ani.dataSaida && tratarData(ani.dataSaida).getTime() >= dataLimiteCusto.getTime());

      return atendeManejo && jaEstavaCadastrado && naoEstavaVendido;
    });

    if (animaisAlvo.length === 0) {
      exibirAlerta('Aviso', 'Nenhum bovino ativo encontrado para esta data.');
      return;
    }

    const custoPorAnimal = valorTotal / animaisAlvo.length;

    const listaAtualizada = animais.map(ani => {
      const pertenceAoGrupo = animaisAlvo.some(alvo => alvo.id === ani.id);
      if (pertenceAoGrupo) {
        const atual = parseFloat(ani.custoManejoAplicado) || 0;
        const novoHist = {
          idRateio: Math.random().toString(),
          descricao: descricaoManejo,
          dataCusto: dataManejoGlobal,
          dataOriginalCusto: dataManejoGlobal,
          valor: custoPorAnimal
        };
        const novaFicha = {
          ...ani,
          custoManejoAplicado: atual + custoPorAnimal,
          historicoRateios: [...(ani.historicoRateios || []), novoHist]
        };

        if (ani.status === 'Vendido') {
          const metricas = calcularMetricasAnimal(novaFicha);
          novaFicha.lucroLiquido = metricas.lucroLiquido;
        }
        return novaFicha;
      }
      return ani;
    });

    salvarDadosLocais(listaAtualizada);
    exibirAlerta('Sucesso', `R$ ${valorTotal.toFixed(2)} divididos entre ${animaisAlvo.length} cabeças.`);
    setDescricaoManejo(''); setCustoManejoGlobal(''); setDataManejoGlobal('');
  };

  // --- REMOVER UM LANÇAMENTO ESPECÍFICO DO HISTÓRICO DE RATEIOS ---
  const excluirCustoIndividual = (animalId, idRateio) => {
    const listaAtualizada = animais.map(ani => {
      if (ani.id === animalId) {
        const historicoFiltrado = (ani.historicoRateios || []).filter(r => r.idRateio !== idRateio);
        const novoCustoAcumulado = historicoFiltrado.reduce((acc, curr) => acc + curr.valor, 0);
        let fichaAtualizada = {
          ...ani,
          historicoRateios: historicoFiltrado,
          custoManejoAplicado: novoCustoAcumulado
        };
        if (ani.status === 'Vendido') {
          const m = calcularMetricasAnimal(fichaAtualizada);
          fichaAtualizada.lucroLiquido = m.lucroLiquido;
        }
        return fichaAtualizada;
      }
      return ani;
    });
    salvarDadosLocais(listaAtualizada);
    exibirAlerta('Sucesso', 'Lançamento removido do histórico deste animal.');
  };

  // --- CADASTRAR OU EDITAR ANIMAL ---
  const salvarAnimal = () => {
    if (!brinco || !pesoEntrada || !precoKgCompra || !dataEntrada) {
      exibirAlerta('Campos Obrigatórios', 'Preencha Brinco, Peso Entrada, Preço por Kg e Data de Entrada.');
      return;
    }

    const pesoIn = parseFloat(pesoEntrada) || 0;
    const pKg = parseFloat(precoKgCompra) || 0;
    const precoCompraCalculado = pesoIn * pKg;
    const medicamentosFiltrados = medicamentos.filter(m => m.nome.trim() !== '');

    let listaAtualizada = [];

    if (idEmEdicao) {
      listaAtualizada = animais.map(ani => {
        if (ani.id === idEmEdicao) {
          let animalEditado = {
            ...ani,
            brinco, raca, categoria,
            pesoEntrada: pesoIn,
            precoKgCompra: pKg,
            precoCompra: precoCompraCalculado,
            dataEntrada,
            custoDiario: parseFloat(custoDiario) || 0,
            piqueManejo, 
            medicamentos: medicamentosFiltrados
          };

          if (ani.status === 'Vendido') {
            const m = calcularMetricasAnimal(animalEditado);
            animalEditado = { ...animalEditado, diasCocho: m.diasCocho, gpd: m.gpd, totalTrato: m.totalTrato, lucroLiquido: m.lucroLiquido };
          }
          return animalEditado;
        }
        return ani;
      });
      setIdEmEdicao(null);
    } else {
      const novoAnimal = {
        id: Math.random().toString(),
        brinco, raca, categoria,
        pesoEntrada: pesoIn,
        precoKgCompra: pKg,
        precoCompra: precoCompraCalculado,
        dataEntrada,
        custoDiario: parseFloat(custoDiario) || 0,
        piqueManejo,
        medicamentos: medicamentosFiltrados,
        custoManejoAplicado: 0,
        historicoRateios: [],
        status: 'Em Engorda',
        pesoSaida: null, precoKgVenda: null, precoVenda: null, dataSaida: null,
        diasCocho: null, gpd: null, lucroLiquido: null, totalTrato: null
      };
      listaAtualizada = [...animais, novoAnimal];
    }

    salvarDadosLocais(listaAtualizada);
    setBrinco(''); setRaca(''); setCategoria(''); setPesoEntrada(''); setPrecoKgCompra(''); setDataEntrada(''); setCustoDiario('');
    setPiqueManejo('Campo'); setMedicamentos([{ id: Math.random().toString(), nome: '', data: '', carencia: '' }]);
  };

  const iniciarEdicao = (animal) => {
    setIdEmEdicao(animal.id);
    setBrinco(animal.brinco || '');
    setRaca(animal.raca || '');
    setCategoria(animal.categoria || '');
    setPesoEntrada(animal.pesoEntrada ? animal.pesoEntrada.toString() : '');
    setPrecoKgCompra(animal.precoKgCompra ? animal.precoKgCompra.toString() : '');
    setDataEntrada(animal.dataEntrada || '');
    setCustoDiario(animal.custoDiario ? animal.custoDiario.toString() : '');
    setPiqueManejo(animal.piqueManejo || 'Campo');
    setMedicamentos(animal.medicamentos && animal.medicamentos.length > 0 ? animal.medicamentos : [{ id: Math.random().toString(), nome: '', data: '', carencia: '' }]);
  };

  const excluirAnimal = (id) => {
    const filtrados = animais.filter(ani => ani.id !== id);
    salvarDadosLocais(filtrados);
    if (animalSelecionado?.id === id) setAnimalSelecionado(null);
  };

  const registrarSaida = () => {
    if (!animalSelecionado) return;
    if (!pesoSaida || !precoKgVenda || !dataSaida) {
      exibirAlerta('Campos Vazios', 'Preencha Peso Saída, Preço Kg Venda e Data Saída.');
      return;
    }

    const pSaida = parseFloat(pesoSaida) || 0;
    const pKgVenda = parseFloat(precoKgVenda) || 0;

    const metricas = calcularMetricasAnimal(animalSelecionado, dataSaida);

    const listaAtualizada = animais.map(ani => {
      if (ani.id === animalSelecionado.id) {
        return {
          ...ani,
          status: 'Vendido',
          pesoSaida: pSaida,
          precoKgVenda: pKgVenda,
          precoVenda: metricas.precoVenda,
          dataSaida,
          diasCocho: metricas.diasCocho,
          gpd: metricas.gpd,
          totalTrato: metricas.totalTrato,
          lucroLiquido: metricas.lucroLiquido
        };
      }
      return ani;
    });

    salvarDadosLocais(listaAtualizada);
    setAnimalSelecionado(null);
    setPesoSaida(''); setPrecoKgVenda(''); setDataSaida('');
  };

  const adicionarLinhaMedicamento = () => {
    setMedicamentos([...medicamentos, { id: Math.random().toString(), nome: '', data: '', carencia: '' }]);
  };

  const actualizarCampoMedicamento = (id, campo, valor) => {
    setMedicamentos(medicamentos.map(med => med.id === id ? { ...med, [campo]: valor } : med));
  };

  // --- FILTRAGEM DINÂMICA DA LISTA ---
  const animaisFiltrados = animais.filter(ani => {
    if (filtroSetor === 'Campo' && (ani.piqueManejo !== 'Campo' || ani.status === 'Vendido')) return false;
    if (filtroSetor === 'Confinamento' && (ani.piqueManejo !== 'Confinamento' || ani.status === 'Vendido')) return false;
    if (filtroSetor === 'Vendidos' && ani.status !== 'Vendido') return false;
    return true;
  });

  // --- GERAR RELATÓRIO EM PDF ---
  const gerarRelatorioPDF = async () => {
    if (animaisFiltrados.length === 0) {
      exibirAlerta('Aviso', 'Não há dados para exportar com os filtros selecionados.');
      return;
    }

    let linhasHtml = '';
    let totalInvestidoGrupo = 0;

    animaisFiltrados.forEach(ani => {
      const m = calcularMetricasAnimal(ani, null, filtroDataCorte);
      totalInvestidoGrupo += m.custoTotalAcumulado;

      let medHtml = '';
      if (ani.medicamentos && ani.medicamentos.length > 0) {
        medHtml = ani.medicamentos.map(m => `${m.nome} (${m.data})`).join('<br/>');
      } else {
        medHtml = 'Nenhum';
      }

      linhasHtml += `
        <tr>
          <td><b>${ani.brinco || 'S/N'}</b></td>
          <td>${ani.raca || '-'} / ${ani.categoria || '-'}</td>
          <td>${ani.piqueManejo === 'Confinamento' ? '🚜 Confin.' : '🌿 Campo'}</td>
          <td>${ani.dataEntrada}</td>
          <td>R$ ${m.custoTotalAcumulado.toFixed(2)}</td>
          <td style="color: #c25900;">${medHtml}</td>
          <td><span style="padding:2px 5px; border-radius:3px; background:${ani.status === 'Vendido'?'#d1e7dd':'#fff3cd'}">${ani.status}</span></td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
            h1 { text-align: center; color: #1A237E; margin-bottom: 5px; }
            h4 { text-align: center; color: #666; margin-top: 0; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #1A237E; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer-total { text-align: right; font-size: 15px; font-weight: bold; margin-top: 25px; color: #1A237E; border-top: 2px solid #1A237E; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Manejo Prático - Relatório de Controle</h1>
          <h4>Filtro Localização: ${filtroSetor} ${filtroDataCorte ? ` | Gastos até: ${filtroDataCorte}` : ''}</h4>
          <table>
            <thead>
              <tr>
                <th>Brinco</th>
                <th>Raça/Cat.</th>
                <th>Regime</th>
                <th>Data Entrada</th>
                <th>Custo Total</th>
                <th>Sanitário Aplicado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
            </tbody>
          </table>
          <div class="footer-total">Valor Total Acumulado no Grupo: R$ ${totalInvestidoGrupo.toFixed(2)}</div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.log("Erro ao gerar PDF", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerTop}>
        <Text style={styles.tituloPrincipal}>Manejo Prático v7.0 💾</Text>
      </View>
      
      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* CARD RATEIO DE CUSTOS GLOBAIS */}
        <View style={styles.cardManejo}>
          <Text style={styles.tituloSecaoManejo}>💰 Lançamento e Rateio Histórico</Text>
          <TextInput style={styles.input} placeholder="Descrição do Custo (ex: Silagem, Cerca)" placeholderTextColor="#888" value={descricaoManejo} onChangeText={setDescricaoManejo} />
          
          <View style={styles.linhaCampos}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Valor (R$)" placeholderTextColor="#888" keyboardType="numeric" value={custoManejoGlobal} onChangeText={setCustoManejoGlobal} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Data do Custo (DD/MM/AAAA)" placeholderTextColor="#888" value={dataManejoGlobal} onChangeText={setDataManejoGlobal} />
          </View>

          <View style={styles.linhaCampos}>
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Alvo do Rateio:</Text>
            <View style={styles.containerFiltroManejo}>
              <TouchableOpacity style={[styles.opcaoFiltro, tipoAlvoRateio === 'Todos' && styles.opcaoFiltroAtiva]} onPress={() => setTipoAlvoRateio('Todos')}><Text style={styles.txtOpceoManejo}>Todos</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.opcaoFiltro, tipoAlvoRateio === 'Campo' && styles.opcaoFiltroAtiva]} onPress={() => setTipoAlvoRateio('Campo')}><Text style={styles.txtOpceoManejo}>Pasto</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.opcaoFiltro, tipoAlvoRateio === 'Confinamento' && styles.opcaoFiltroAtiva]} onPress={() => setTipoAlvoRateio('Confinamento')}><Text style={styles.txtOpceoManejo}>Confin.</Text></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.botaoManejo} onPress={distribuirCustosGlobais}><Text style={styles.textoBotao}>Aplicar Rateio (Por Data de Entrada)</Text></TouchableOpacity>
        </View>

        {/* CARD FICHA CADASTRO / EDIÇÃO */}
        <View style={styles.card}>
          <Text style={styles.tituloSecao}>{idEmEdicao ? '✏️ Alterando Cadastro Animal' : '📥 Entrada / Novo Registro'}</Text>
          <View style={styles.linhaCampos}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Brinco" placeholderTextColor="#888" value={brinco} onChangeText={setBrinco} />
            <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Raça" placeholderTextColor="#888" value={raca} onChangeText={setRaca} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Categoria" placeholderTextColor="#888" value={categoria} onChangeText={setCategoria} />
          </View>
          <View style={styles.linhaCampos}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Peso In (kg)" placeholderTextColor="#888" keyboardType="numeric" value={pesoEntrada} onChangeText={setPesoEntrada} />
            <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Preço p/ Kg Compra" placeholderTextColor="#888" keyboardType="numeric" value={precoKgCompra} onChangeText={setPrecoKgCompra} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Data Entrada" placeholderTextColor="#888" value={dataEntrada} onChangeText={setDataEntrada} />
          </View>
          <TextInput style={styles.input} placeholder="Custo Diário de Trato Próprio (R$/dia)" placeholderTextColor="#888" keyboardType="numeric" value={custoDiario} onChangeText={setCustoDiario} />

          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>📍 Setor Atual do Animal:</Text>
          <View style={[styles.linhaCampos, { marginBottom: 15 }]}>
            <TouchableOpacity style={[styles.btnManejoBicho, piqueManejo === 'Campo' && styles.btnManejoBichoAtivo]} onPress={() => setPiqueManejo('Campo')}><Text style={styles.textoBotao}>🌿 À Campo / Pasto</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnManejoBicho, piqueManejo === 'Confinamento' && styles.btnManejoBichoAtivo]} onPress={() => setPiqueManejo('Confinamento')}><Text style={styles.textoBotao}>🚜 Confinamento</Text></TouchableOpacity>
          </View>

          {/* MEDICAMENTOS */}
          <View style={styles.linhaItem}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFF' }}>💉 Sanitário</Text>
            <TouchableOpacity style={styles.btnMaisMedicamento} onPress={adicionarLinhaMedicamento}><Text style={styles.txtBtnMais}>+ Novo Lançamento</Text></TouchableOpacity>
          </View>
          {medicamentos.map((med, index) => (
            <View key={med.id} style={styles.containerMedicamentoLinha}>
              <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder={`Produto ${index + 1}`} placeholderTextColor="#888" value={med.nome} onChangeText={(v) => actualizarCampoMedicamento(med.id, 'nome', v)} />
              <TextInput style={[styles.input, { flex: 1.5, marginRight: 6 }]} placeholder="Data" placeholderTextColor="#888" value={med.data} onChangeText={(v) => actualizarCampoMedicamento(med.id, 'data', v)} />
              <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Carência" placeholderTextColor="#888" keyboardType="numeric" value={med.carencia} onChangeText={(v) => actualizarCampoMedicamento(med.id, 'carencia', v)} />
            </View>
          ))}
          <TouchableOpacity style={styles.botaoEntrada} onPress={salvarAnimal}><Text style={styles.textoBotao}>Salvar Ficha do Animal</Text></TouchableOpacity>
        </View>

        {/* CARD DE CONFIGURAR ATUALIZAÇÃO DE SAÍDA */}
        <View style={[styles.card, !animalSelecionado && styles.cardDesativado]}>
          <Text style={styles.tituloSecao}>📤 Fechamento de Lote (Venda / Abate)</Text>
          <View style={styles.linhaCampos}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Peso Final Venda" placeholderTextColor="#888" keyboardType="numeric" editable={!!animalSelecionado} value={pesoSaida} onChangeText={setPesoSaida} />
            <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Preço Kg Recebido" placeholderTextColor="#888" keyboardType="numeric" editable={!!animalSelecionado} value={precoKgVenda} onChangeText={setPrecoKgVenda} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Data Abate" placeholderTextColor="#888" editable={!!animalSelecionado} value={dataSaida} onChangeText={setDataSaida} />
          </View>
          <TouchableOpacity style={[styles.botaoSaida, !animalSelecionado && styles.botaoDesativado]} onPress={registrarSaida} disabled={!animalSelecionado}><Text style={styles.textoBotao}>Calcular Lucro Líquido Real</Text></TouchableOpacity>
        </View>

        {/* CONTROLES DE FILTRAGEM AVANÇADA */}
        <View style={styles.cardFiltros}>
          <Text style={styles.tituloFiltros}>🔍 Painel de Controle e Filtros de Busca</Text>
          <View style={styles.linhaFiltrosBotoes}>
            <TouchableOpacity style={[styles.btnFiltroOpcao, filtroSetor === 'Todos' && styles.btnFiltroOpcaoAtivo]} onPress={() => setFiltroSetor('Todos')}><Text style={styles.txtFiltroBtn}>Todos</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnFiltroOpcao, filtroSetor === 'Campo' && styles.btnFiltroOpcaoAtivo]} onPress={() => setFiltroSetor('Campo')}><Text style={styles.txtFiltroBtn}>🌿 Pasto</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnFiltroOpcao, filtroSetor === 'Confinamento' && styles.btnFiltroOpcaoAtivo]} onPress={() => setFiltroSetor('Confinamento')}><Text style={styles.txtFiltroBtn}>🚜 Confin.</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnFiltroOpcao, filtroSetor === 'Vendidos' && styles.btnFiltroOpcaoAtivo]} onPress={() => setFiltroSetor('Vendidos')}><Text style={styles.txtFiltroBtn}>💰 Vendidos</Text></TouchableOpacity>
          </View>
          <TextInput style={[styles.input, { marginTop: 12, marginBottom: 4 }]} placeholder="Calcular gastos acumulados até que data? (DD/MM/AAAA)" placeholderTextColor="#888" value={filtroDataCorte} onChangeText={setFiltroDataCorte} />
          
          <TouchableOpacity style={styles.btnPdf} onPress={gerarRelatorioPDF}>
            <Text style={styles.txtBtnPdf}>📄 Exportar para PDF (Lista Filtrada)</Text>
          </TouchableOpacity>
        </View>

        {/* EXIBIÇÃO DA LISTA DE MONITORAMENTO */}
        <Text style={styles.tituloLista}>📋 Monitoramento de Rebanho ({animaisFiltrados.length} cabeças filtradas)</Text>
        {animaisFiltrados.length === 0 ? <Text style={styles.txtVazio}>Nenhum animal correspondente aos filtros.</Text> : (
          animaisFiltrados.map((item) => {
            const mCalculada = calcularMetricasAnimal(item, null, filtroDataCorte);
            return (
              <View key={item.id} style={[styles.itemAnimal, item.status === 'Vendido' ? styles.itemVendido : styles.itemEngorda, animalSelecionado?.id === item.id && styles.itemSelecionado]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => item.status === 'Em Engorda' && setAnimalSelecionado(item)}>
                  <View style={styles.linhaItem}>
                    <Text style={styles.txtBrinco}>🐮 Brinco: {item.brinco || 'S/N'} | {item.raca || 'Mestiço'}</Text>
                    <Text style={[styles.badgeLocal, item.piqueManejo === 'Confinamento' ? styles.badgeConf : styles.badgePasto]}>{item.piqueManejo === 'Confinamento' ? '🚜 Confinamento' : '🌿 Pasto'}</Text>
                  </View>
                  <Text style={styles.txtDetalhe}>Entrada: {item.dataEntrada} | Peso Inicial: {item.pesoEntrada || 0} kg</Text>
                  <Text style={styles.txtDetalhe}>💰 Compra: R$ {(item.precoCompra || 0).toFixed(2)} | Diária Trato: R$ {(item.custoDiario || 0).toFixed(2)}/dia</Text>
                  
                  {/* BOX CORRIGIDO DE EXIBIÇÃO DE MEDICAMENTOS */}
                  <View style={styles.containerMedicamentoExibicao}>
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>💉 Histórico Sanitário:</Text>
                    {item.medicamentos && item.medicamentos.length > 0 ? (
                      item.medicamentos.map((med, mIdx) => (
                        <Text key={med.id || mIdx} style={styles.txtMedicamentoItem}>• {med.nome} | Aplicado: {med.data} (Carência: {med.carencia || '0'} dias)</Text>
                      ))
                    ) : (
                      <Text style={[styles.txtMedicamentoItem, { fontStyle: 'italic', color: '#888' }]}>Nenhum medicamento registrado.</Text>
                    )}
                  </View>

                  {/* HISTÓRICO DE RATEIOS COM BOTÃO DE REMOÇÃO INDIVIDUAL */}
                  <Text style={[styles.txtDetalhe, { fontWeight: 'bold', color: '#29B6F6', marginTop: 8 }]}>📊 Detalhamento de Custos Rateados: R$ {mCalculada.apenasRateios.toFixed(2)}</Text>
                  {item.historicoRateios && item.historicoRateios.map((rat, rIdx) => (
                    <View key={rat.idRateio || rIdx} style={styles.linhaRateioItem}>
                      <Text style={styles.txtHistRateio}>↳ {rat.descricao} ({rat.dataCusto}): +R$ {(rat.valor || 0).toFixed(2)}</Text>
                      <TouchableOpacity onPress={() => excluirCustoIndividual(item.id, rat.idRateio)}>
                        <Text style={styles.txtRemoverCusto}>[Excluir]</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <Text style={[styles.txtDetalhe, { fontWeight: 'bold', color: '#FFF', marginTop: 8, fontSize: 13 }]}>📉 CUSTO ACUMULADO TOTAL: R$ {mCalculada.custoTotalAcumulado.toFixed(2)}</Text>

                  {item.status === 'Vendido' && (
                    <View style={styles.PainelResultado}>
                      <Text style={styles.txtResultado}>Data Saída: {item.dataSaida} ({item.diasCocho || 0} dias de ciclo)</Text>
                      <Text style={styles.txtResultado}>💰 Faturamento Bruto: R$ {(item.precoVenda || 0).toFixed(2)}</Text>
                      <Text style={styles.txtResultadoGpd}>📈 GPD Médio: {(item.gpd || 0).toFixed(3)} kg/dia</Text>
                      <Text style={[styles.txtLucro, item.lucroLiquido >= 0 ? styles.lucroPositivo : styles.lucroNegativo]}>💸 LUCRO LÍQUIDO REAL: R$ {(item.lucroLiquido || 0).toFixed(2)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.containerAcoesFicha}>
                  <TouchableOpacity style={styles.btnEditarCard} onPress={() => iniciarEdicao(item)}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Editar Ficha</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.btnExcluirCard} onPress={() => excluirAnimal(item.id)}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Excluir</Text></TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121212', 
    paddingTop: 20,
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginVertical: 10 },
  tituloPrincipal: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  scrollContainer: { paddingHorizontal: 15 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2F2F2F' },
  cardManejo: { backgroundColor: '#1A237E', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#3F51B5' },
  cardDesativado: { opacity: 0.4 },
  cardFiltros: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#444' },
  tituloFiltros: { fontSize: 15, fontWeight: 'bold', color: '#29B6F6', marginBottom: 12 },
  linhaFiltrosBotoes: { flexDirection: 'row', justifyContent: 'space-between' },
  btnFiltroOpcao: { flex: 1, backgroundColor: '#333', paddingVertical: 8, marginHorizontal: 2, borderRadius: 6, alignItems: 'center' },
  btnFiltroOpcaoAtivo: { backgroundColor: '#29B6F6' },
  txtFiltroBtn: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  btnPdf: { backgroundColor: '#E64A19', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  txtBtnPdf: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#00E676', marginBottom: 15 },
  tituloSecaoManejo: { fontSize: 16, fontWeight: 'bold', color: '#29B6F6', marginBottom: 12 },
  btnMaisMedicamento: { backgroundColor: '#29B6F6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  txtBtnMais: { color: '#121212', fontSize: 12, fontWeight: 'bold' },
  containerMedicamentoLinha: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  containerMedicamentoExibicao: { backgroundColor: '#262626', padding: 8, borderRadius: 6, marginTop: 8 },
  txtMedicamentoItem: { color: '#AEEA00', fontSize: 12, marginTop: 2 },
  linhaCampos: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  input: { backgroundColor: '#2A2A2A', color: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12, width: '100%' },
  containerFiltroManejo: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 8, padding: 3, flex: 1.5, marginLeft: 10 },
  opcaoFiltro: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  opcaoFiltroAtiva: { backgroundColor: '#29B6F6' },
  txtOpceoManejo: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  btnManejoBicho: { flex: 1, backgroundColor: '#333', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  btnManejoBichoAtivo: { backgroundColor: '#00E676' },
  botaoEntrada: { backgroundColor: '#00E676', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  botaoSaida: { backgroundColor: '#29B6F6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  botaoManejo: { backgroundColor: '#00E676', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  botaoDesativado: { backgroundColor: '#555' },
  textoBotao: { color: '#121212', fontSize: 14, fontWeight: 'bold' },
  tituloLista: { fontSize: 17, fontWeight: 'bold', color: '#FFF', marginTop: 10, marginBottom: 15 },
  txtVazio: { color: '#888', textAlign: 'center', fontStyle: 'italic', marginTop: 10 },
  itemAnimal: { borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 2, backgroundColor: '#1E1E1E' },
  itemEngorda: { borderColor: '#333' },
  itemVendido: { borderColor: '#1b4332' },
  itemSelecionado: { borderColor: '#29B6F6', backgroundColor: '#252525' },
  linhaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  txtBrinco: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  badgeLocal: { fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePasto: { backgroundColor: '#1b4332', color: '#FFF' },
  badgeConf: { backgroundColor: '#D32F2F', color: '#FFF' },
  txtDetalhe: { color: '#BBB', fontSize: 12, marginBottom: 3 },
  linhaRateioItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, paddingRight: 4 },
  txtHistRateio: { color: '#AAA', fontSize: 11, marginLeft: 10, fontStyle: 'italic' },
  txtRemoverCusto: { color: '#FF5252', fontSize: 11, fontWeight: 'bold', marginLeft: 10 },
  PainelResultado: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1b4332' },
  txtResultado: { color: '#FFF', fontSize: 13, marginBottom: 2 },
  txtResultadoGpd: { color: '#29B6F6', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  txtLucro: { fontSize: 15, fontWeight: 'bold', marginTop: 6 },
  lucroPositivo: { color: '#00E676' },
  lucroNegativo: { color: '#FF5252' },
  containerAcoesFicha: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#333', marginTop: 10, paddingTop: 8 },
  btnEditarCard: { backgroundColor: '#FFB300', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  btnExcluirCard: { backgroundColor: '#FF5252', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }
});

registerRootComponent(App);