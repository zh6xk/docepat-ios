import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { decode } from 'base64-arraybuffer';

export default function App() {
  const [form, setForm] = useState({
    jenisUjian: 'UJIAN AKHIR SEMESTER',
    mataKuliah: '',
    semester: '',
    ganjilGenap: 'Genap',
    nama: '',
    nim: '',
    prodi: '',
    fakultas: '',
    universitas: 'Universitas Amikom Yogyakarta',
    tahun: new Date().getFullYear().toString()
  });

  const [logo, setLogo] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const pickLogo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 1,
    });
    if (!result.canceled) {
      setLogo(result.assets[0]);
    }
  };

  const pickPdf = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: true
    });
    if (result.canceled === false) {
      const newPdfs = result.assets.map(a => ({ ...a, skipCover: true }));
      setPdfs([...pdfs, ...newPdfs]);
    }
  };

  const generatePdf = async () => {
    if (pdfs.length === 0) {
      Alert.alert('Error', 'Import PDF dulu!');
      return;
    }
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const fontReg = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      
      const drawText = (text, y, font, size) => {
        if (!text) return;
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color: rgb(0,0,0) });
      };

      let currentY = height - 100;
      drawText(form.jenisUjian.toUpperCase(), currentY, fontBold, 16);
      currentY -= 30;
      drawText(form.mataKuliah.toUpperCase(), currentY, fontBold, 14);
      currentY -= 30;
      drawText(`SEMESTER ${form.semester} ${form.ganjilGenap}`.trim(), currentY, fontReg, 12);
      currentY -= 150;

      if (logo && logo.base64) {
        try {
          const isPng = logo.uri.toLowerCase().endsWith('png');
          const logoImage = isPng ? await pdfDoc.embedPng(logo.base64) : await pdfDoc.embedJpg(logo.base64);
          const logoDims = logoImage.scale(0.5);
          page.drawImage(logoImage, {
            x: (width - 150) / 2,
            y: currentY - 75,
            width: 150,
            height: 150,
          });
        } catch (e) {
           drawText('[ LOGO ]', currentY, fontBold, 16);
        }
      } else {
        drawText('[ LOGO ]', currentY, fontBold, 16);
      }
      
      currentY -= 200;
      drawText('Disusun Oleh:', currentY, fontBold, 12);
      currentY -= 20;
      drawText(form.nama, currentY, fontReg, 12);
      currentY -= 20;
      drawText(form.nim, currentY, fontReg, 12);
      currentY -= 60;
      drawText(form.prodi.toUpperCase(), currentY, fontBold, 14);
      currentY -= 25;
      drawText(form.fakultas.toUpperCase(), currentY, fontBold, 14);
      currentY -= 25;
      drawText(form.universitas.toUpperCase(), currentY, fontBold, 14);
      currentY -= 25;
      drawText(form.tahun, currentY, fontReg, 12);

      for (const file of pdfs) {
        const fileB64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const donorPdf = await PDFDocument.load(fileB64);
        const donorPages = await pdfDoc.copyPages(donorPdf, donorPdf.getPageIndices());
        
        donorPages.forEach((donorPage, idx) => {
          if (idx === 0 && file.skipCover) return;
          pdfDoc.addPage(donorPage);
        });
      }

      const pdfBytes = await pdfDoc.saveAsBase64();
      const path = `${FileSystem.documentDirectory}Tugas_${form.mataKuliah || 'DOCEPAT'}.pdf`;
      await FileSystem.writeAsStringAsync(path, pdfBytes, { encoding: FileSystem.EncodingType.Base64 });
      
      setIsGenerating(false);
      await Sharing.shareAsync(path);

    } catch (error) {
      setIsGenerating(false);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>COVER PAGE</Text>
        
        <Text style={styles.label}>Jenis Ujian</Text>
        <TextInput style={styles.input} value={form.jenisUjian} onChangeText={(t)=>setForm({...form, jenisUjian: t})} placeholderTextColor="#666" placeholder="Misal: UAS" />
        
        <Text style={styles.label}>Mata Kuliah</Text>
        <TextInput style={styles.input} value={form.mataKuliah} onChangeText={(t)=>setForm({...form, mataKuliah: t})} placeholderTextColor="#666" />
        
        <Text style={styles.label}>Semester</Text>
        <TextInput style={styles.input} value={form.semester} onChangeText={(t)=>setForm({...form, semester: t})} placeholderTextColor="#666" />
        
        <Text style={styles.label}>Nama Lengkap</Text>
        <TextInput style={styles.input} value={form.nama} onChangeText={(t)=>setForm({...form, nama: t})} placeholderTextColor="#666" />
        
        <Text style={styles.label}>NIM</Text>
        <TextInput style={styles.input} value={form.nim} onChangeText={(t)=>setForm({...form, nim: t})} placeholderTextColor="#666" />
        
        <Text style={styles.label}>Program Studi</Text>
        <TextInput style={styles.input} value={form.prodi} onChangeText={(t)=>setForm({...form, prodi: t})} placeholderTextColor="#666" />
        
        <Text style={styles.label}>Fakultas</Text>
        <TextInput style={styles.input} value={form.fakultas} onChangeText={(t)=>setForm({...form, fakultas: t})} placeholderTextColor="#666" />
        
        <Text style={styles.label}>Universitas</Text>
        <TextInput style={styles.input} value={form.universitas} onChangeText={(t)=>setForm({...form, universitas: t})} placeholderTextColor="#666" />
        
        <Text style={styles.label}>Tahun</Text>
        <TextInput style={styles.input} value={form.tahun} onChangeText={(t)=>setForm({...form, tahun: t})} placeholderTextColor="#666" />

        <View style={styles.divider} />
        
        <Text style={styles.header}>LOGO COVER</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.btnSmall} onPress={pickLogo}><Text style={styles.btnText}>Pilih Logo</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnSmallOutline} onPress={()=>setLogo(null)}><Text style={styles.btnText}>Hapus</Text></TouchableOpacity>
        </View>
        {logo && <Text style={styles.subtext}>Logo terpilih.</Text>}

        <View style={styles.divider} />
        
        <Text style={styles.header}>DOKUMEN PDF (MERGE)</Text>
        <Text style={styles.infoText}>Catatan: Versi iOS tidak dukung import DOCX. Convert ke PDF dulu sebelum diimport.</Text>
        <TouchableOpacity style={styles.btnSmall} onPress={pickPdf}><Text style={styles.btnText}>+ Import PDF</Text></TouchableOpacity>
        
        {pdfs.map((p, idx) => (
          <View key={idx} style={styles.fileCard}>
            <Text style={styles.fileText} numberOfLines={1}>{p.name}</Text>
            <TouchableOpacity onPress={() => {
              let newPdfs = [...pdfs];
              newPdfs[idx].skipCover = !newPdfs[idx].skipCover;
              setPdfs(newPdfs);
            }}>
              <Text style={styles.skipText}>{p.skipCover ? '✅ Buang Hal 1' : '❌ Jangan Buang'}</Text>
            </TouchableOpacity>
          </View>
        ))}

      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnGenerate} onPress={generatePdf} disabled={isGenerating}>
          <Text style={styles.btnGenText}>{isGenerating ? 'PROCESSING...' : 'GENERATE .PDF'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 20, paddingBottom: 100, paddingTop: 60 },
  header: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  label: { color: '#a0a0b0', fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: '#16213e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 20 },
  row: { flexDirection: 'row', gap: 10 },
  btnSmall: { backgroundColor: '#0f3460', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnSmallOutline: { borderWidth: 1, borderColor: '#0f3460', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  subtext: { color: '#a0a0b0', fontSize: 12, marginTop: 5 },
  infoText: { color: '#e94560', fontSize: 11, marginBottom: 10 },
  fileCard: { backgroundColor: '#16213e', padding: 15, borderRadius: 8, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fileText: { color: '#fff', flex: 1, marginRight: 10 },
  skipText: { color: '#e94560', fontWeight: 'bold', fontSize: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#1a1a2e' },
  btnGenerate: { backgroundColor: '#e94560', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnGenText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
