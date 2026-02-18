/**
 * Tests for useCamera composable
 * Tests camera functionality in web mode (non-native) with file input fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let useCamera

describe('useCamera', () => {
    beforeEach(async () => {
        vi.resetModules()
        window.Capacitor = undefined

        const mod = await import('../useCamera.js')
        useCamera = mod.useCamera
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return takePhoto, photoToFormData, and lastPhoto', () => {
        const { takePhoto, photoToFormData, lastPhoto } = useCamera()

        expect(typeof takePhoto).toBe('function')
        expect(typeof photoToFormData).toBe('function')
        expect(lastPhoto.value).toBeNull()
    })

    it('should create a file input element for web photo capture', async () => {
        const createElementSpy = vi.spyOn(document, 'createElement')

        const { takePhoto } = useCamera()

        // Mock the file input click and cancel
        createElementSpy.mockImplementation((tag) => {
            if (tag === 'input') {
                const input = {
                    type: '',
                    accept: '',
                    capture: '',
                    onchange: null,
                    oncancel: null,
                    click: vi.fn(function () {
                        // Simulate cancel
                        if (this.oncancel) this.oncancel()
                    })
                }
                return input
            }
            return document.createElement(tag)
        })

        const result = await takePhoto({ source: 'gallery' })
        expect(result).toBeNull()
        expect(createElementSpy).toHaveBeenCalledWith('input')
    })

    it('should set capture attribute when source is camera', async () => {
        let capturedInput = null
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            if (tag === 'input') {
                capturedInput = {
                    type: '',
                    accept: '',
                    capture: '',
                    onchange: null,
                    oncancel: null,
                    click: vi.fn(function () {
                        if (this.oncancel) this.oncancel()
                    })
                }
                return capturedInput
            }
        })

        const { takePhoto } = useCamera()
        await takePhoto({ source: 'camera' })

        expect(capturedInput.capture).toBe('environment')
        expect(capturedInput.accept).toBe('image/*')
    })

    it('should resolve with photo data when file is selected', async () => {
        const fakeBase64 = 'dGVzdGRhdGE=' // "testdata" in base64
        const fakeDataUrl = `data:image/png;base64,${fakeBase64}`
        let capturedInput = null

        // Replace FileReader with a class-based mock before creating the input
        const originalFileReader = globalThis.FileReader
        class MockFileReader {
            constructor() {
                this.onload = null
                this.result = null
            }
            readAsDataURL() {
                this.result = fakeDataUrl
                if (this.onload) this.onload()
            }
        }
        globalThis.FileReader = MockFileReader

        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            if (tag === 'input') {
                capturedInput = {
                    type: '',
                    accept: '',
                    capture: '',
                    onchange: null,
                    oncancel: null,
                    click: vi.fn(function () {
                        // Simulate file selection
                        const fakeFile = new File(['testdata'], 'photo.png', { type: 'image/png' })
                        const fakeEvent = { target: { files: [fakeFile] } }
                        if (this.onchange) this.onchange(fakeEvent)
                    })
                }
                return capturedInput
            }
        })

        const { takePhoto, lastPhoto } = useCamera()
        const result = await takePhoto()

        // Restore FileReader
        globalThis.FileReader = originalFileReader

        expect(result).not.toBeNull()
        expect(result.base64).toBe(fakeBase64)
        expect(result.format).toBe('png')
        expect(result.dataUrl).toBe(fakeDataUrl)
        expect(lastPhoto.value).toEqual(result)
    })

    it('should resolve null when no file is selected', async () => {
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            if (tag === 'input') {
                return {
                    type: '',
                    accept: '',
                    capture: '',
                    onchange: null,
                    oncancel: null,
                    click: vi.fn(function () {
                        // Simulate change with no file
                        if (this.onchange) this.onchange({ target: { files: [] } })
                    })
                }
            }
        })

        const { takePhoto } = useCamera()
        const result = await takePhoto()
        expect(result).toBeNull()
    })

    describe('photoToFormData', () => {
        it('should return null for null photo', () => {
            const { photoToFormData } = useCamera()
            expect(photoToFormData(null)).toBeNull()
        })

        it('should use file directly when available (web mode)', () => {
            const { photoToFormData } = useCamera()
            const fakeFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
            const photo = {
                base64: 'abc',
                format: 'jpeg',
                dataUrl: 'data:image/jpeg;base64,abc',
                file: fakeFile
            }

            const formData = photoToFormData(photo)
            expect(formData).toBeInstanceOf(FormData)
            expect(formData.get('photo')).toBe(fakeFile)
        })

        it('should use custom field name', () => {
            const { photoToFormData } = useCamera()
            const fakeFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
            const photo = {
                base64: 'abc',
                format: 'jpeg',
                dataUrl: 'data:image/jpeg;base64,abc',
                file: fakeFile
            }

            const formData = photoToFormData(photo, 'avatar')
            expect(formData.get('avatar')).toBe(fakeFile)
        })

        it('should convert base64 to blob when no file (native mode)', () => {
            const { photoToFormData } = useCamera()
            const photo = {
                base64: 'dGVzdA==', // "test" in base64
                format: 'jpeg',
                dataUrl: 'data:image/jpeg;base64,dGVzdA=='
            }

            const formData = photoToFormData(photo)
            expect(formData).toBeInstanceOf(FormData)

            const blob = formData.get('photo')
            expect(blob).toBeInstanceOf(Blob)
            expect(blob.type).toBe('image/jpeg')
        })
    })
})
