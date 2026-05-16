import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import FileManager from './screens/FileManager';
import FileViewer from './screens/FileViewer';
import { FileProvider } from './context/FileContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <FileProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="FileManager"
            component={FileManager}
            options={{ title: 'Файловий менеджер' }}
          />
          <Stack.Screen
            name="FileViewer"
            component={FileViewer}
            options={{ title: 'Перегляд файлу' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </FileProvider>
  );
}
