import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

export default function EditProfileDialog() {
  const { profile, user, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [specialties, setSpecialties] = useState('');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setSpecialties((profile.specialties || []).join(', '));
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const specialtiesArr = specialties
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || 'User',
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
        specialties: specialtiesArr,
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save profile: ' + error.message);
    } else {
      toast.success('Profile updated!');
      await refreshProfile();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground">Display name</label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="mt-1"
              maxLength={50}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Bio</label>
            <Textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="mt-1 resize-none"
              maxLength={280}
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Avatar URL</label>
            <Input
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              className="mt-1"
              placeholder="https://example.com/photo.jpg"
              type="url"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Specialties</label>
            <Input
              value={specialties}
              onChange={e => setSpecialties(e.target.value)}
              className="mt-1"
              placeholder="Politics, Economy, Football"
            />
            <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
          </div>
          <Button className="w-full gradient-primary border-0" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
