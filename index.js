import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO ---
const SUPABASE_URL = 'https://bonhkjxiujzewagjizsr.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eXQWjpoahbmM8tJDULkcsA_TC96ttWP'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // Estados Globais
  const [estaLogado, setEstaLogado] = useState(false);
  const [animais, setAnimais] = useState([]);
  const [usuarioInput, setUsuarioInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('Todos');
  const [filtroDataCorte, setFiltroDataCorte] = useState('');
  const [animaisFiltrados, setAnimaisFiltrados] = useState([]);const [estaLogado, setEstaLogado] = useState(false);

  const [brinco, setBrinco] = useState('');
  
  // --- FUNÇÕES DE APOIO ---
  const realizarLogin = () => {
    if (usuarioInput === 'admin' && senhaInput === 'admin') setEstaLogado(true);
    else Alert.alert('Erro', 'Usuário ou senha incorretos.');
  }
  
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

  // --- FUNÇÕES ---
  const exibirAlerta = (titulo, mensagem) => Platform.OS === 'web' ? alert(`${titulo}: ${mensagem}`) : Alert.alert(titulo, mensagem);

  const realizarLogin = () => {
    if (usuarioInput.trim() === 'admin' && senhaInput === 'admin') {
      setEstaLogado(true);
    } else {
      exibirAlerta('Erro', 'Usuário ou senha incorretos.');
    }
  };

  async function carregarDadosOnline() {
    try {
      const { data, error } = await supabase.from('dados_rebanho').select('lista_animais').eq('id', 1).maybeSingle();
      if (data?.lista_animais) setAnimais(typeof data.lista_animais === 'string' ? JSON.parse(data.lista_animais) : data.lista_animais);
    } catch (e) { console.log("Erro carregar:", e); }
  }

  // --- RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      {!estaLogado ? (
        <View style={styles.telaLogin}>
          <TextInput placeholder="Usuário" style={styles.input} onChangeText={setUsuarioInput} />
          <TextInput placeholder="Senha" style={styles.input} secureTextEntry onChangeText={setSenhaInput} />
          <TouchableOpacity onPress={realizarLogin} style={styles.botaoEntrada}><Text>Entrar</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView>
          <Text style={{color: '#FFF'}}>Bem-vindo ao Manejo Prático</Text>
          {/* Aqui você insere o restante do seu código (Cards, Listas, Botões) */}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 20 },
  input: { backgroundColor: '#2A2A2A', color: '#FFF', borderRadius: 8, padding: 12, marginBottom: 10 },
  telaLogin: { flex: 1, justifyContent: 'center', padding: 20 },
  botaoEntrada: { backgroundColor: '#00E676', padding: 15, borderRadius: 8, alignItems: 'center' }
});

registerRootComponent(App);