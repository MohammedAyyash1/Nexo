// نقطة مركزية وحيدة لعنوان الـBackend بكل الـFrontend
// بالتطوير المحلي: يرجع للـfallback (localhost:3001) لو المتغير غير معرّف
// بالإنتاج: لازم VITE_API_URL يكون معرّف فعليًا بملف .env، وإلا التطبيق لن يعمل بشكل صحيح
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';