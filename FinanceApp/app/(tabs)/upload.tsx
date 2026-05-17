import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import type { PdfUpload, UploadStatus } from '@/types';

export default function UploadScreen() {

  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<PdfUpload[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    const { data } = await supabase
      .from('pdf_uploads')
      .select('id, file_name, status, transaction_count, error_message, created_at')
      .neq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setUploads(data as PdfUpload[]);
    setLoadingHistory(false);
  };

  const pickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setUploading(true);

      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // 2. Upload PDF to Supabase Storage
      const storagePath = `${user.id}/${Date.now()}_${asset.name}`;
      const file = new File(asset.uri);
      const arrayBuffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);

      const { error: storageError } = await supabase.storage
        .from('bank-statements')
        .upload(storagePath, byteArray, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

      // 3. Insert pdf_uploads row
      const { data: uploadRow, error: dbError } = await supabase
        .from('pdf_uploads')
        .insert({ user_id: user.id, file_name: asset.name, storage_path: storagePath })
        .select('id')
        .single();

      if (dbError || !uploadRow) throw new Error('Failed to create upload record');

      // Optimistically show as pending
      setUploads((prev) => [
        {
          id: uploadRow.id,
          file_name: asset.name,
          status: 'pending',
          transaction_count: null,
          error_message: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      // 4. Call Edge Function to process PDF
      const fnRes = await supabase.functions.invoke('process-pdf', {
        body: { upload_id: uploadRow.id, storage_path: storagePath },
      });

      if (fnRes.error) {
        let detail = fnRes.error.message;
        try {
          const body = await (fnRes.error as any).context?.json?.();
          if (body?.error) detail = body.error;
        } catch {}
        throw new Error(`Edge function: ${detail}`);
      }

      // 5. Refresh list to get final status
      await fetchUploads();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Upload Failed', message);
      await fetchUploads();
    } finally {
      setUploading(false);
    }
  };

  const statusLabel: Record<UploadStatus, string> = {
    pending: 'Queued',
    processing: 'Extracting...',
    done: 'Done',
    failed: 'Failed',
  };

  const statusColor: Record<UploadStatus, string> = {
    pending: R.textSecondary,
    processing: R.warning,
    done: R.income,
    failed: R.expense,
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Upload PDF</Text>
        <Text style={styles.subtitle}>Import bank statements — transactions extracted automatically</Text>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={pickAndUpload}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <>
              <ActivityIndicator color={R.white} />
              <Text style={styles.uploadButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <IconSymbol name="arrow.up.doc.fill" size={28} color={R.white} />
              <Text style={styles.uploadButtonText}>Select PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.fileList}>
          <Text style={styles.sectionTitle}>Upload History</Text>

          {loadingHistory ? (
            <ActivityIndicator color={R.accent} style={{ marginTop: 24 }} />
          ) : uploads.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text.fill" size={48} color={R.textSecondary} />
              <Text style={styles.emptyText}>No uploads yet</Text>
              <Text style={styles.emptySubtext}>
                Upload a bank statement PDF to automatically extract your transactions
              </Text>
            </View>
          ) : (
            uploads.map((upload) => (
              <View key={upload.id} style={styles.fileCard}>
                <IconSymbol
                  name="doc.fill"
                  size={24}
                  color={upload.status === 'failed' ? R.expense : R.accent}
                />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {upload.file_name}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {formatDate(upload.created_at)}
                    {upload.transaction_count != null
                      ? ` · ${upload.transaction_count} transactions`
                      : ''}
                  </Text>
                  {upload.error_message ? (
                    <Text style={styles.errorText} numberOfLines={2}>
                      {upload.error_message}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.statusBadge, { color: statusColor[upload.status] }]}>
                    {statusLabel[upload.status]}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
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
    marginBottom: 40,
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
    flex: 1,
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
  errorText: {
    fontSize: 11,
    color: R.expense,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
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
