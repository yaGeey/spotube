import { create } from 'zustand'
type AppStore = {}
const useAppStore = create<AppStore>((set) => ({}))
export default useAppStore
