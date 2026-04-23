import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

export default function NovaTrocaScreen({ navigation }: any) {
  const [containerRetirado, setContainerRetirado] = useState('')
  const [containerEntregue, setContainerEntregue] = useState('')
  const [observacao, setObservacao] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState<string | null>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const buscarCliente = async (numero: string) => {
    if (!numero || numero.length < 1) {
      setClienteEncontrado(null)
      return
    }
    setBuscandoCliente(true)
    const { data } = await supabase
      .from('controle')
      .select('cliente')
      .eq('id_container', numero)
      .is('data_retirada', null)
      .maybeSingle()
    setBuscandoCliente(false)
    setClienteEncontrado(data?.cliente ?? null)
  }

  const handleContainerRetiradoChange = (val: string) => {
    setContainerRetirado(val)
    clearTimeout((buscarCliente as any)._timer)
    ;(buscarCliente as any)._timer = setTimeout(() => buscarCliente(val), 600)
  }

  const enviar = async () => {
    if (!containerRetirado || !containerEntregue) {
      Alert.alert('Atenção', 'Preencha os campos de caçamba retirada e entregue.')
      return
    }
    const raw = await AsyncStorage.getItem('motorista')
    if (!raw) {
      Alert.alert('Sessão expirada', 'Faça login novamente.')
      navigation.replace('Login')
      return
    }
    const motorista = JSON.parse(raw)
    setEnviando(true)
    const { error } = await supabase.from('trocas_pendentes').insert({
      motorista_nome: motorista.nome,
      cliente: clienteEncontrado ?? null,
      container_retirado: containerRetirado,
      container_entregue: containerEntregue,
      observacao: observacao.trim() || null,
      status: 'PENDENTE',
      criado_em: new Date().toISOString(),
    })
    setEnviando(false)
    if (error) {
      Alert.alert('Erro', 'Não foi possível enviar. Tente novamente.')
      return
    }
    setContainerRetirado('')
    setContainerEntregue('')
    setObservacao('')
    setClienteEncontrado(null)
    Alert.alert('Sucesso', 'Troca enviada para aprovação!')
  }

  const sair = async () => {
    await AsyncStorage.removeItem('motorista')
    navigation.replace('Login')
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.titulo}>Nova Troca</Text>
            <TouchableOpacity onPress={sair}>
              <Text style={s.sairText}>Sair</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Caçamba Retirada</Text>
          <TextInput
            style={s.input}
            placeholder="Número do container"
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
            value={containerRetirado}
            onChangeText={handleContainerRetiradoChange}
          />

          {buscandoCliente && (
            <ActivityIndicator color="#d97706" style={{ marginBottom: 8 }} />
          )}
          {clienteEncontrado !== null && !buscandoCliente && (
            <View style={s.clienteCard}>
              <Text style={s.clienteLabel}>Cliente encontrado:</Text>
              <Text style={s.clienteNome}>{clienteEncontrado}</Text>
            </View>
          )}
          {containerRetirado.length > 0 && clienteEncontrado === null && !buscandoCliente && (
            <Text style={s.semCliente}>Nenhum cliente encontrado para este container</Text>
          )}

          <Text style={s.label}>Caçamba Entregue</Text>
          <TextInput
            style={s.input}
            placeholder="Número do container"
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
            value={containerEntregue}
            onChangeText={setContainerEntregue}
          />

          <Text style={s.label}>Observação (opcional)</Text>
          <TextInput
            style={[s.input, s.inputMultiline]}
            placeholder="Alguma observação..."
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={3}
            value={observacao}
            onChangeText={setObservacao}
          />

          <TouchableOpacity style={s.botao} onPress={enviar} activeOpacity={0.8} disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color="#0d1a0d" />
            ) : (
              <Text style={s.botaoText}>Enviar para aprovação</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.botaoSecundario} onPress={() => navigation.navigate('MinhasTrocas')}>
            <Text style={s.botaoSecundarioText}>Ver minhas trocas</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1a0d' },
  scroll: { padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#d97706' },
  sairText: { color: '#6b7280', fontSize: 14 },
  label: { color: '#f5f0e8', fontSize: 14, marginBottom: 6, opacity: 0.8 },
  input: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2d4a2d',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: '#f5f0e8',
    fontSize: 16,
    marginBottom: 16,
  },
  inputMultiline: {
    height: 90,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  clienteCard: {
    backgroundColor: '#0d2e1a',
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  clienteLabel: { color: '#86efac', fontSize: 12, marginBottom: 2 },
  clienteNome: { color: '#4ade80', fontSize: 16, fontWeight: 'bold' },
  semCliente: { color: '#ef4444', fontSize: 13, marginBottom: 12 },
  botao: {
    backgroundColor: '#d97706',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  botaoText: { color: '#0d1a0d', fontSize: 17, fontWeight: 'bold' },
  botaoSecundario: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d4a2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoSecundarioText: { color: '#f5f0e8', fontSize: 15 },
})
