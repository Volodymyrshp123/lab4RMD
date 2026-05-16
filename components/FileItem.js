import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FileItem({ item, onOpen, onDelete, onDetails }) {
  return (
    <View style={styles.item}>
      <TouchableOpacity style={styles.main} onPress={onOpen}>
        <Text style={styles.icon}>{item.isDirectory ? '📁' : '📄'}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {item.isDirectory ? 'Папка' : `${item.type} • ${item.sizeLabel}`}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onDetails}>
          <Text style={styles.actionText}>Інфо</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
          <Text style={[styles.actionText, styles.deleteText]}>Видалити</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  icon: {
    width: 32,
    fontSize: 22,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    marginTop: 2,
    color: '#6b7280',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  deleteButton: {
    borderColor: '#fecaca',
  },
  actionText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteText: {
    color: '#dc2626',
  },
});
