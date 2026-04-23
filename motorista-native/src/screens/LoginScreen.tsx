import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

const SENHA_FIXA = '102030'

type Motorista = { id: number; nome: string }

export default function LoginScreen({ navigation }: any) {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [motoristaSelecionado, setMotoristaSelecionado] = useState<Motorista | null>(null)
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLista, setLoadingLista] = useState(false)
  const [listVisible, setListVisible] = useState(false)

  const buscarMotoristas = async () => {
    setLoadingLista(true)
    const { data, error } = await supabase.from('motoristas').select('id, nome').order('nome')
    setLoadingLista(false)
    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar motoristas.')
      return
    }
    setMotoristas(data || [])
    setListVisible(true)
  }

  const selecionarMotorista = (m: Motorista) => {
    setMotoristaSelecionado(m)
    setListVisible(false)
  }

  const entrar = async () => {
    if (!motoristaSelecionado) {
      Alert.alert('Atenção', 'Selecione um motorista.')
      return
    }
    if (senha !== SENHA_FIXA) {
      Alert.alert('Senha incorreta', 'A senha informada está errada.')
      return
    }
    setLoading(true)
    await AsyncStorage.setItem('motorista', JSON.stringify(motoristaSelecionado))
    setLoading(false)
    navigation.replace('NovaTroca')
  }

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.titulo}>Trans Ambiental</Text>
      <Text style={s.subtitulo}>Acesso do Motorista</Text>

      <TouchableOpacity style={s.selectorBtn} onPress={buscarMotoristas} activeOpacity={0.8}>
        {loadingLista ? (
          <ActivityIndicator color="#d97706" />
        ) : (
          <Text style={motoristaSelecionado ? s.selectorText : s.selectorPlaceholder}>
            {motoristaSelecionado ? motoristaSelecionado.nome : 'Selecionar motorista...'}
          </Text>
        )}
      </TouchableOpacity>

      {listVisible && (
        <FlatList
          data={motoristas}
          keyExtractor={(item) => String(item.id)}
          style={s.lista}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.listaItem} onPress={() => selecionarMotorista(item)}>
              <Text style={s.listaItemText}>{item.nome}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TextInput
        style={s.input}
        placeholder="Senha"
        placeholderTextColor="#6b7280"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity style={s.botao} onPress={entrar} activeOpacity={0.8} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#0d1a0d" />
        ) : (
          <Text style={s.botaoText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1a0d',
    padding: 24,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d97706',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 16,
    color: '#f5f0e8',
    textAlign: 'center',
    marginBottom: 36,
    opacity: 0.7,
  },
  selectorBtn: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2d4a2d',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectorText: {
    color: '#f5f0e8',
    fontSize: 16,
  },
  selectorPlaceholder: {
    color: '#6b7280',
    fontSize: 16,
  },
  lista: {
    backgroundColor: '#1a2e1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d4a2d',
    maxHeight: 220,
    marginBottom: 12,
  },
  listaItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a2d',
  },
  listaItemText: {
    color: '#f5f0e8',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2d4a2d',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: '#f5f0e8',
    fontSize: 16,
    marginBottom: 24,
  },
  botao: {
    backgroundColor: '#d97706',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoText: {
    color: '#0d1a0d',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
