import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export function Profile() {
  const { user, profile, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')
  const [infoError, setInfoError] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [emailError, setEmailError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setInfoError('')
    setInfoMsg('')
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      await refreshProfile()
      setInfoMsg('Foto de perfil actualizada.')
    } catch (err) {
      console.error('Avatar upload error:', err)
      setInfoError(
        err.message?.includes('bucket')
          ? 'No se encontró el almacenamiento de fotos. Pedile a tu administrador que configure el bucket "avatars" en Supabase.'
          : err.message || 'No se pudo subir la foto de perfil.'
      )
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSaveInfo(e) {
    e.preventDefault()
    setInfoError('')
    setInfoMsg('')
    setSavingInfo(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      setInfoMsg('Datos guardados correctamente.')
    } catch (err) {
      console.error('Update profile error:', err)
      setInfoError(err.message || 'No se pudieron guardar los datos.')
    } finally {
      setSavingInfo(false)
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault()
    setEmailError('')
    setEmailMsg('')

    if (!newEmail.trim()) {
      setEmailError('Ingresá el nuevo correo electrónico.')
      return
    }

    setSavingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error

      setEmailMsg('Te enviamos un correo de confirmación a la nueva dirección. El cambio se aplica una vez que lo confirmes.')
      setNewEmail('')
    } catch (err) {
      console.error('Update email error:', err)
      setEmailError(err.message || 'No se pudo actualizar el correo electrónico.')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordMsg('')

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordMsg('Contraseña actualizada correctamente.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Update password error:', err)
      setPasswordError(err.message || 'No se pudo actualizar la contraseña.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-wide text-chalk">Mi perfil</h1>

      {/* Foto de perfil + datos personales */}
      <section className="mb-8 rounded-lg border border-line bg-panel-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-chalk">Datos personales</h2>

        <div className="mb-6 flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Foto de perfil"
              className="h-20 w-20 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-panel text-2xl font-semibold text-muted">
              {(fullName || profile?.email || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <label className="inline-block cursor-pointer rounded border border-line px-3 py-1.5 text-sm text-chalk-dim hover:border-cobalt hover:text-chalk">
              {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-xs text-muted">JPG o PNG, opcional.</p>
          </div>
        </div>

        {infoError && <p className="mb-3 text-sm text-danger">{infoError}</p>}
        {infoMsg && <p className="mb-3 text-sm text-cobalt">{infoMsg}</p>}

        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Número de teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. +54 9 11 1234-5678"
              className="w-full rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
          </div>
          <button
            type="submit"
            disabled={savingInfo}
            className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {savingInfo ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </section>

      {/* Cambiar correo electrónico */}
      <section className="mb-8 rounded-lg border border-line bg-panel-raised p-6">
        <h2 className="mb-1 text-lg font-semibold text-chalk">Correo electrónico</h2>
        <p className="mb-4 text-sm text-muted">Actual: {profile?.email}</p>

        {emailError && <p className="mb-3 text-sm text-danger">{emailError}</p>}
        {emailMsg && <p className="mb-3 text-sm text-cobalt">{emailMsg}</p>}

        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Nuevo correo electrónico</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
          </div>
          <button
            type="submit"
            disabled={savingEmail}
            className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {savingEmail ? 'Actualizando...' : 'Actualizar correo'}
          </button>
        </form>
      </section>

      {/* Cambiar contraseña */}
      <section className="rounded-lg border border-line bg-panel-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-chalk">Contraseña</h2>

        {passwordError && <p className="mb-3 text-sm text-danger">{passwordError}</p>}
        {passwordMsg && <p className="mb-3 text-sm text-cobalt">{passwordMsg}</p>}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded border border-line bg-panel px-3 py-2 text-chalk outline-none focus:border-cobalt"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded bg-cobalt px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </section>
    </div>
  )
}
