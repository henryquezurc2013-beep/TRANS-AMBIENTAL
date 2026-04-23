import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

type Troca = {
  id: number
  container_retirado: string
  container_entregue: string
  cliente: string | null
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  motivo_rejeicao: string | null
  created_at: string
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDENTE: { bg: '#78350f', text: '#fde68a', label: 'Pendente' },
  APROVADO: { bg: '#14532d', text: '#86efac', label: 'Aprovado' },
  REJEITADO: { bg: '#7f1d1d', text: '#fca5a5', label: 'Rejeitado' },
}

export default function MinhasTrocasScreen({ navigation }: any) {
  const [trocas, setTrocas] = useState<Troca[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const carregar = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    const raw = await AsyncStorage.getItem('motorista')
    if (!raw) {
      navigation.replace('Login')
      return
    }
    const motorista = JSON.parse(raw)
    const { data } = await supabase
      .from('trocas_pendentes')
      .select('*')
      .eq('motorista_nome', motorista.nome)
      .order('created_at', { ascending: false })
    setTrocas(data || [])
    isRefresh ? setRefreshing(false) : setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      carregar()
    }, [])
  )

  const renderItem = ({ item }: { item: Troca }) => {
    const st = STATUS_STYLE[item.status] || STATUS_STYLE.PENDENTE
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardData}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.colLabel}>Retirada</Text>
            <Text style={s.colValue}>#{item.container_retirado}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.colLabel}>Entregue</Text>
            <Text style={s.colValue}>#{item.container_entregue}</Text>
          </View>
        </View>

        {item.cliente && (
          <Text style={s.cliente}>{item.cliente}</Text>
        )}

        {item.status === 'REJEITADO' && item.motivo_rejeicao && (
          <View style={s.motivoBox}>
            <Text style={s.motivoLabel}>Motivo:</Text>
            <Text style={s.motivoText}>{item.motivo_rejeicao}</Text>
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#d97706" size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.voltar}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Minhas Trocas</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={trocas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => carregar(true)}
            tintColor="#d97706"
            colors={['#d97706']}
          />
        }
        ListEmptyComponent={
          <Text style={s.vazio}>Nenhuma troca encontrada.</Text>
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1a0d' },
  center: { flex: 1, backgroundColor: '#0d1a0d', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  voltar: { color: '#d97706', fontSize: 15 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#f5f0e8' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1a2e1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d4a2d',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardData: { color: '#9ca3af', fontSize: 13 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  col: { flex: 1 },
  colLabel: { color: '#6b7280', fontSize: 12, marginBottom: 2 },
  colValue: { color: '#f5f0e8', fontSize: 18, fontWeight: 'bold' },
  cliente: { color: '#86efac', fontSize: 14, marginTop: 4 },
  motivoBox: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  motivoLabel: { color: '#fca5a5', fontSize: 12, marginBottom: 2 },
  motivoText: { color: '#fecaca', fontSize: 14 },
  vazio: { color: '#6b7280', textAlign: 'center', marginTop: 60, fontSize: 16 },
})
