import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ahaxhsikhipniukfnkcf.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoYXhoc2lraGlwbml1a2Zua2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTk1NTc2MjAsImV4cCI6MTk3NTEzMzYyMH0.BOJyELTTCmALW1uV1j6l_kIzHnWzQD8JkR58zFvibow"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)