import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { GLSL, Node, Shaders } from "gl-react";
import { Surface } from "gl-react-expo";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";


const shaders = Shaders.create({
  Sepia: {
    frag: GLSL`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D image;
      void main() {
        vec4 color = texture2D(image, uv);
        float r = color.r;
        float g = color.g;
        float b = color.b;
        gl_FragColor = vec4(
          r * 0.393 + g * 0.769 + b * 0.189,
          r * 0.349 + g * 0.686 + b * 0.168,
          r * 0.272 + g * 0.534 + b * 0.131,
          1.0
        );
      }`,
  },
  BW: {
    frag: GLSL`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D image;
      void main() {
        vec4 color = texture2D(image, uv);
        float gray = (color.r + color.g + color.b) / 3.0;
        gl_FragColor = vec4(vec3(gray), 1.0);
      }`,
  },
  Contrast: {
    frag: GLSL`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D image;
      uniform float contrast;
      void main() {
        vec4 color = texture2D(image, uv);
        color.rgb = ((color.rgb - 0.5) * contrast + 0.5);
        gl_FragColor = color;
      }`,
  },
  Blur: {
    frag: GLSL`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D image;
      void main() {
        vec4 sum = vec4(0.0);
        float blurSize = 1.0/512.0;
        for (int x = -4; x <= 4; x++) {
          for (int y = -4; y <= 4; y++) {
            sum += texture2D(image, uv + vec2(x, y) * blurSize);
          }
        }
        gl_FragColor = sum / 81.0;
      }`,
  },
});

// filtros
const Sepia = ({ image }) => <Node shader={shaders.Sepia} uniforms={{ image }} />;
const BW = ({ image }) => <Node shader={shaders.BW} uniforms={{ image }} />;
const Contrast = ({ image }) => <Node shader={shaders.Contrast} uniforms={{ image, contrast: 1.5 }} />;
const Blur = ({ image }) => <Node shader={shaders.Blur} uniforms={{ image }} />;

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [filter, setFilter] = useState("none");
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(cameraStatus.status === "granted" && mediaStatus.status === "granted");
    })();
  }, []);

  const takePhoto = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync();
      setPhoto(data.uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const savePhoto = async () => {
    if (photo) {
      await MediaLibrary.saveToLibraryAsync(photo);
      Alert.alert("Imagem salva na galeria!");
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>Permissão negada</Text>;

  const renderFilteredImage = () => {
    switch (filter) {
      case "sepia": return <Sepia image={{ uri: photo }} />;
      case "bw": return <BW image={{ uri: photo }} />;
      case "contrast": return <Contrast image={{ uri: photo }} />;
      case "blur": return <Blur image={{ uri: photo }} />;
      default: return <Image source={{ uri: photo }} style={styles.preview} />;
    }
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        <Camera style={styles.camera} ref={cameraRef} />
      ) : (
        <Surface style={styles.preview}>{renderFilteredImage()}</Surface>
      )}

      <ScrollView horizontal style={styles.controls}>
        {!photo ? (
          <>
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Text style={styles.text}>📸 Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={pickFromGallery}>
              <Text style={styles.text}>🖼️ Galeria</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.button} onPress={() => setFilter("bw")}>
              <Text style={styles.text}>⚫ P&B</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setFilter("sepia")}>
              <Text style={styles.text}>🟤 Sépia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setFilter("contrast")}>
              <Text style={styles.text}>🌈 Contraste</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setFilter("blur")}>
              <Text style={styles.text}>💨 Blur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={savePhoto}>
              <Text style={styles.text}>💾 Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setPhoto(null)}>
              <Text style={styles.text}>🔙 Voltar</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1, width: "100%" },
  preview: { flex: 1, width: "100%", height: "100%" },
  controls: {
    backgroundColor: "#111",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  button: {
    marginHorizontal: 5,
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  text: { color: "#fff", fontSize: 14 },
});