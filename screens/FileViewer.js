import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

function getFileName(path) {
  return decodeURIComponent(path.split('/').filter(Boolean).pop() || 'file.txt');
}

export default function FileViewer({ route, navigation }) {
  const { path } = route.params;
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: getFileName(path) });

    const loadFile = async () => {
      try {
        const data = await FileSystem.readAsStringAsync(path);
        setContent(data);
        setSavedContent(data);
      } catch (error) {
        Alert.alert('Помилка', 'Не вдалося відкрити файл.');
      }
    };

    loadFile();
  }, [navigation, path]);

  const saveFile = async () => {
    try {
      setIsSaving(true);
      await FileSystem.writeAsStringAsync(path, content);
      setSavedContent(content);
      Alert.alert('Готово', 'Зміни збережено.');
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти файл.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Вміст текстового файлу</Text>
      <TextInput
        style={styles.input}
        multiline
        textAlignVertical="top"
        value={content}
        onChangeText={setContent}
        placeholder="Введіть текст..."
      />
      <TouchableOpacity
        style={[styles.saveButton, (isSaving || content === savedContent) && styles.disabledButton]}
        onPress={saveFile}
        disabled={isSaving || content === savedContent}
      >
        <Text style={styles.saveText}>{isSaving ? 'Збереження...' : 'Зберегти зміни'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  label: {
    marginBottom: 8,
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: 16,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#2563eb',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
