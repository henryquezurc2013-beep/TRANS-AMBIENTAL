import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import LoginScreen from './src/screens/LoginScreen'
import NovaTrocaScreen from './src/screens/NovaTrocaScreen'
import MinhasTrocasScreen from './src/screens/MinhasTrocasScreen'

const Stack = createStackNavigator()

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null)

  useEffect(() => {
    AsyncStorage.getItem('motorista').then((val) => {
      setInitialRoute(val ? 'NovaTroca' : 'Login')
    })
  }, [])

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1a0d', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#d97706" size="large" />
        <StatusBar style="light" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="NovaTroca" component={NovaTrocaScreen} />
        <Stack.Screen name="MinhasTrocas" component={MinhasTrocasScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
