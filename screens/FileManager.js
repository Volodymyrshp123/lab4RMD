import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import FileItem from '../components/FileItem';
import { useFile } from '../context/FileContext';

const ROOT_PATH = FileSystem.documentDirectory;

function normalizeDirectory(path) {
  return path.endsWith('/') ? path : `${path}/`;
}

function joinPath(directory, name) {
  return `${normalizeDirectory(directory)}${name}`;
}

function getParentPath(path) {
  const root = normalizeDirectory(ROOT_PATH);
  const normalized = normalizeDirectory(path);

  if (normalized === root) {
    return root;
  }

  const withoutLastSlash = normalized.slice(0, -1);
  const parent = withoutLastSlash.slice(0, withoutLastSlash.lastIndexOf('/') + 1);
  return parent.length >= root.length ? parent : root;
}

function getRelativePath(path) {
  const root = normalizeDirectory(ROOT_PATH);
  const normalized = normalizeDirectory(path);
  const relative = normalized.replace(root, '').replace(/\/$/, '');

  return relative ? `Головна / ${relative.split('/').join(' / ')}` : 'Головна';
}

function getExtension(name, isDirectory) {
  if (isDirectory) {
    return 'Папка';
  }

  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(dotIndex + 1).toUpperCase() : 'Без розширення';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return 'Невідомо';
  }

  if (bytes === 0) {
    return '0 Б';
  }

  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(seconds) {
  if (!seconds) {
    return 'Невідомо';
  }

  return new Date(seconds * 1000).toLocaleString('uk-UA');
}

function cleanName(name) {
  return name.trim().replace(/[\\/]/g, '');
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function FileManager() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createMode, setCreateMode] = useState(null);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [storage, setStorage] = useState(null);
  const { currentPath, setCurrentPath } = useFile();
  const navigation = useNavigation();

  const activePath = currentPath || normalizeDirectory(ROOT_PATH);
  const isRoot = normalizeDirectory(activePath) === normalizeDirectory(ROOT_PATH);

  const loadStorage = async () => {
    try {
      const [total, free] = await Promise.all([
        FileSystem.getTotalDiskCapacityAsync(),
        FileSystem.getFreeDiskStorageAsync(),
      ]);

      setStorage({
        total,
        free,
        used: Math.max(total - free, 0),
      });
    } catch (error) {
      setStorage(null);
    }
  };

  const loadDirectory = useCallback(
    async (path = activePath) => {
      const directory = normalizeDirectory(path);

      try {
        setIsLoading(true);
        const names = await FileSystem.readDirectoryAsync(directory);
        const nextItems = await Promise.all(
          names.map(async (name) => {
            const pathToItem = joinPath(directory, name);
            const info = await FileSystem.getInfoAsync(pathToItem);
            const itemPath = info.isDirectory ? normalizeDirectory(pathToItem) : pathToItem;
            const type = getExtension(name, info.isDirectory);

            return {
              name,
              path: itemPath,
              isDirectory: info.isDirectory,
              size: info.size,
              sizeLabel: info.isDirectory ? '-' : formatBytes(info.size || 0),
              modificationTime: info.modificationTime,
              modifiedLabel: formatDate(info.modificationTime),
              type,
            };
          })
        );

        nextItems.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }

          return a.name.localeCompare(b.name, 'uk');
        });

        setItems(nextItems);
        setCurrentPath(directory);
      } catch (error) {
        Alert.alert('Помилка', 'Не вдалося прочитати директорію.');
      } finally {
        setIsLoading(false);
      }
    },
    [activePath, setCurrentPath]
  );

  useEffect(() => {
    const root = normalizeDirectory(ROOT_PATH);
    setCurrentPath(root);
    loadDirectory(root);
    loadStorage();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDirectory(activePath);
      if (isRoot) {
        loadStorage();
      }
    }, [activePath, isRoot, loadDirectory])
  );

  const openCreateModal = (mode) => {
    setCreateMode(mode);
    setNewName('');
    setNewContent('');
  };

  const closeCreateModal = () => {
    setCreateMode(null);
    setNewName('');
    setNewContent('');
  };

  const createItem = async () => {
    const name = cleanName(newName);

    if (!name) {
      Alert.alert('Увага', 'Введіть назву.');
      return;
    }

    try {
      if (createMode === 'folder') {
        const folderPath = normalizeDirectory(joinPath(activePath, name));
        const existing = await FileSystem.getInfoAsync(folderPath);

        if (existing.exists) {
          Alert.alert('Увага', 'Папка з такою назвою вже існує.');
          return;
        }

        await FileSystem.makeDirectoryAsync(folderPath);
      } else {
        const fileName = name.toLowerCase().endsWith('.txt') ? name : `${name}.txt`;
        const filePath = joinPath(activePath, fileName);
        const existing = await FileSystem.getInfoAsync(filePath);

        if (existing.exists) {
          Alert.alert('Увага', 'Файл з такою назвою вже існує.');
          return;
        }

        await FileSystem.writeAsStringAsync(filePath, newContent);
      }

      closeCreateModal();
      loadDirectory(activePath);
      loadStorage();
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося створити об’єкт.');
    }
  };

  const openItem = (item) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
      return;
    }

    if (item.name.toLowerCase().endsWith('.txt')) {
      navigation.navigate('FileViewer', { path: item.path });
      return;
    }

    Alert.alert('Недоступно', 'Для перегляду підтримуються лише текстові файли .txt.');
  };

  const goUp = () => {
    if (!isRoot) {
      loadDirectory(getParentPath(activePath));
    }
  };

  const deleteItem = (item) => {
    Alert.alert('Підтвердження', `Видалити "${item.name}"?`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(item.path, { idempotent: true });
            loadDirectory(activePath);
            loadStorage();
          } catch (error) {
            Alert.alert('Помилка', 'Не вдалося видалити об’єкт.');
          }
        },
      },
    ]);
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Директорія порожня</Text>
      <Text style={styles.emptyText}>Створіть папку або текстовий файл.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {isRoot && (
        <View style={styles.storageBox}>
          <Text style={styles.sectionTitle}>Памʼять пристрою</Text>
          <View style={styles.storageGrid}>
            <View style={styles.storageCell}>
              <Text style={styles.storageLabel}>Загалом</Text>
              <Text style={styles.storageValue}>{formatBytes(storage?.total)}</Text>
            </View>
            <View style={styles.storageCell}>
              <Text style={styles.storageLabel}>Вільно</Text>
              <Text style={styles.storageValue}>{formatBytes(storage?.free)}</Text>
            </View>
            <View style={styles.storageCell}>
              <Text style={styles.storageLabel}>Зайнято</Text>
              <Text style={styles.storageValue}>{formatBytes(storage?.used)}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.pathBox}>
        <Text style={styles.pathLabel}>Поточний шлях</Text>
        <Text style={styles.pathText}>{getRelativePath(activePath)}</Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={[styles.toolbarButton, isRoot && styles.disabledButton]} onPress={goUp} disabled={isRoot}>
          <Text style={styles.toolbarButtonText}>Вгору</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => openCreateModal('folder')}>
          <Text style={styles.toolbarButtonText}>Нова папка</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => openCreateModal('file')}>
          <Text style={styles.primaryButtonText}>Новий .txt</Text>
        </TouchableOpacity>
      </View>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2563eb" />
      ) : (
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <FileItem
              item={item}
              onOpen={() => openItem(item)}
              onDelete={() => deleteItem(item)}
              onDetails={() => setSelectedItem(item)}
            />
          )}
          keyExtractor={(item) => item.path}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => loadDirectory(activePath)} />}
          contentContainerStyle={items.length === 0 && styles.emptyList}
        />
      )}

      <Modal visible={Boolean(createMode)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{createMode === 'folder' ? 'Створення папки' : 'Створення текстового файлу'}</Text>
            <TextInput
              placeholder={createMode === 'folder' ? 'Назва папки' : 'Назва файлу'}
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />
            {createMode === 'file' && (
              <TextInput
                placeholder="Початковий вміст"
                value={newContent}
                onChangeText={setNewContent}
                style={[styles.input, styles.contentInput]}
                multiline
                textAlignVertical="top"
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeCreateModal}>
                <Text style={styles.secondaryButtonText}>Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={createItem}>
                <Text style={styles.primaryButtonText}>Створити</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedItem)} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Детальна інформація</Text>
            {selectedItem && (
              <ScrollView>
                <InfoRow label="Назва" value={selectedItem.name} />
                <InfoRow label="Тип" value={selectedItem.type} />
                <InfoRow label="Розмір" value={selectedItem.isDirectory ? 'Папка' : selectedItem.sizeLabel} />
                <InfoRow label="Остання модифікація" value={selectedItem.modifiedLabel} />
                <InfoRow label="Шлях" value={getRelativePath(selectedItem.path)} />
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.primaryButton, styles.fullButton]} onPress={() => setSelectedItem(null)}>
              <Text style={styles.primaryButtonText}>Закрити</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  storageBox: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#eff6ff',
  },
  sectionTitle: {
    marginBottom: 8,
    color: '#1e3a8a',
    fontSize: 16,
    fontWeight: '700',
  },
  storageGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  storageCell: {
    flex: 1,
  },
  storageLabel: {
    color: '#475569',
    fontSize: 12,
  },
  storageValue: {
    marginTop: 2,
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  pathBox: {
    marginBottom: 12,
  },
  pathLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pathText: {
    marginTop: 4,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  toolbarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  toolbarButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  loader: {
    marginTop: 48,
  },
  emptyList: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    maxHeight: '86%',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    marginBottom: 12,
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    color: '#111827',
    fontSize: 16,
  },
  contentInput: {
    minHeight: 130,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  fullButton: {
    marginTop: 12,
  },
  infoRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 3,
    color: '#111827',
    fontSize: 15,
  },
});
