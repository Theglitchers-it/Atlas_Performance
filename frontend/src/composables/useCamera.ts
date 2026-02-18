/**
 * useCamera Composable
 * Accesso camera nativa su Capacitor con fallback a file input su web
 */

import { ref, type Ref } from 'vue'

export interface PhotoResult {
    base64: string
    format: string
    dataUrl: string
    file?: File
}

export interface CameraOptions {
    quality?: number
    width?: number
    height?: number
    source?: 'camera' | 'gallery' | 'prompt'
}

interface UseCameraReturn {
    takePhoto: (options?: CameraOptions) => Promise<PhotoResult | null>
    photoToFormData: (photo: PhotoResult | null, fieldName?: string) => FormData | null
    lastPhoto: Ref<PhotoResult | null>
}

export function useCamera(): UseCameraReturn {
    const isNative = window.Capacitor?.isNativePlatform() || false
    const lastPhoto = ref<PhotoResult | null>(null)

    /**
     * Scatta foto o seleziona da galleria
     * @param options
     * @param options.quality - Qualita immagine 1-100 (default: 80)
     * @param options.width - Larghezza max (default: 1200)
     * @param options.height - Altezza max (default: 1200)
     * @param options.source - Sorgente immagine
     * @returns { base64: string, format: string, dataUrl: string }
     */
    const takePhoto = async (options: CameraOptions = {}): Promise<PhotoResult | null> => {
        if (isNative) {
            return await takePhotoNative(options)
        }
        return await takePhotoWeb(options)
    }

    /**
     * Implementazione nativa con Capacitor Camera
     */
    const takePhotoNative = async (options: CameraOptions): Promise<PhotoResult | null> => {
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

            const sourceMap: Record<string, any> = {
                camera: CameraSource.Camera,
                gallery: CameraSource.Photos,
                prompt: CameraSource.Prompt
            }

            const photo = await Camera.getPhoto({
                quality: options.quality || 80,
                resultType: CameraResultType.Base64,
                source: sourceMap[options.source ?? 'prompt'] || CameraSource.Prompt,
                width: options.width || 1200,
                height: options.height || 1200,
                correctOrientation: true,
                presentationStyle: 'fullscreen'
            })

            const result: PhotoResult = {
                base64: photo.base64String ?? '',
                format: photo.format || 'jpeg',
                dataUrl: `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`
            }

            lastPhoto.value = result
            return result
        } catch (error) {
            // L'utente ha annullato o c'e stato un errore
            const err = error as Error
            if (err.message?.includes('cancelled') || err.message?.includes('User cancelled')) {
                return null
            }
            throw error
        }
    }

    /**
     * Fallback web con file input
     */
    const takePhotoWeb = (options: CameraOptions): Promise<PhotoResult | null> => {
        return new Promise((resolve) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'

            if (options.source === 'camera') {
                input.capture = 'environment'
            }

            input.onchange = (event: Event) => {
                const file = (event.target as HTMLInputElement).files?.[0]
                if (!file) {
                    resolve(null)
                    return
                }

                const reader = new FileReader()
                reader.onload = () => {
                    const readerResult = reader.result as string
                    const base64 = readerResult.split(',')[1]
                    const format = file.type.split('/')[1] || 'jpeg'
                    const result: PhotoResult = {
                        base64,
                        format,
                        dataUrl: readerResult,
                        file // File originale per upload via FormData
                    }
                    lastPhoto.value = result
                    resolve(result)
                }
                reader.readAsDataURL(file)
            }

            input.oncancel = () => resolve(null)
            input.click()
        })
    }

    /**
     * Converte foto in FormData per upload API
     * @param photo - Risultato di takePhoto()
     * @param fieldName - Nome campo form (default: 'photo')
     * @returns FormData
     */
    const photoToFormData = (photo: PhotoResult | null, fieldName: string = 'photo'): FormData | null => {
        if (!photo) return null

        const formData = new FormData()

        if (photo.file) {
            // Web: file originale disponibile
            formData.append(fieldName, photo.file)
        } else if (photo.base64) {
            // Native: converti base64 in Blob
            const byteCharacters = atob(photo.base64)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: `image/${photo.format}` })
            formData.append(fieldName, blob, `photo.${photo.format}`)
        }

        return formData
    }

    return {
        takePhoto,
        photoToFormData,
        lastPhoto
    }
}
