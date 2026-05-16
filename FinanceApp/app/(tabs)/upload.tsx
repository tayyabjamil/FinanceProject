import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { R } from '@/constants/theme';

interface UploadedFile {
  name: string;
  size: number;
  uri: string;
  uploadedAt: Date;
}

export default function UploadScreen() {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setUploading(true);

      // Copy to app's document directory for persistence
      const destDir = FileSystem.documentDirectory + 'pdfs/';
      const dirInfo = await FileSystem.getInfoAsync(destDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      }

      const destPath = destDir + asset.name;
      await FileSystem.copyAsync({ from: asset.uri, to: destPath });

      const newFile: UploadedFile = {
        name: asset.name,
        size: asset.size ?? 0,
        uri: destPath,
        uploadedAt: new Date(),
      };

      setFiles((prev) => [newFile, ...prev]);
    } catch {
      Alert.alert('Error', 'Failed to upload PDF. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = (uri: string) => {
    Alert.alert('Remove File', 'Remove this file from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          setFiles((prev) => prev.filter((f) => f.uri !== uri));
        },
      },
    ]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Upload PDF</Text>
        <Text style={styles.subtitle}>Import bank statements or receipts</Text>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={pickPDF}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator color={R.white} />
          ) : (
            <>
              <IconSymbol name="arrow.up.doc.fill" size={28} color={R.white} />
              <Text style={styles.uploadButtonText}>Select PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {files.length > 0 && (
          <View style={styles.fileList}>
            <Text style={styles.sectionTitle}>Uploaded Files</Text>
            {files.map((file) => (
              <View key={file.uri} style={styles.fileCard}>
                <IconSymbol name="doc.fill" size={24} color={R.accent} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {formatSize(file.size)} · {file.uploadedAt.toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteFile(file.uri)} hitSlop={8}>
                  <IconSymbol name="trash.fill" size={18} color={R.expense} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {files.length === 0 && !uploading && (
          <View style={styles.emptyState}>
            <IconSymbol name="doc.text.fill" size={48} color={R.textSecondary} />
            <Text style={styles.emptyText}>No PDFs uploaded yet</Text>
            <Text style={styles.emptySubtext}>
              Upload bank statements or receipts to get started
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: R.bg,
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: R.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: R.textSecondary,
    marginBottom: 32,
  },
  uploadButton: {
    backgroundColor: R.accent,
    borderRadius: 16,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: R.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: R.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: R.white,
    marginBottom: 12,
  },
  fileList: {
    marginTop: 32,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: R.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: R.border,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: R.white,
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 12,
    color: R.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: R.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: R.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
