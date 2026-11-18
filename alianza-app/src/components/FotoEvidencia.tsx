import React from 'react';
import { Image, ImageProps } from 'react-native';
import { fotoSource } from '../api/client';

/** Foto de evidencia de un hallazgo: del servidor (enlace firmado) o guardada en el teléfono. */
export default function FotoEvidencia({ foto, ...props }: { foto: string } & Omit<ImageProps, 'source'>) {
  return <Image {...props} source={fotoSource(foto)} />;
}
