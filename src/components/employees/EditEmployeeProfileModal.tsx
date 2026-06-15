import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isValid, parseISO } from 'date-fns';
import {
  User,
  Phone,
  Calendar,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui';
import {
  employeeModalFieldInputClass,
  employeeModalFieldLabelClass,
} from '@/components/employees/employee-modal-fields';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types';

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Must be exactly 10 digits'),
});
export type EditEmployeeProfileForm = z.infer<typeof editSchema>;

function formatEmployeeDisplayId(id: string) {
  const year = new Date().getFullYear();
  const tail = id.replace(/-/g, '').slice(-3).toUpperCase();
  return `ED-${year}-${tail.padStart(3, '0')}`;
}

function formatJoiningDateInput(createdAt?: string) {
  if (!createdAt) return '';
  const d = parseISO(createdAt);
  return isValid(d) ? format(d, 'MM/dd/yyyy') : '';
}

export type EditEmployeeProfileSavePayload = {
  values: EditEmployeeProfileForm;
  photoFile: File | null;
  photoRemoved: boolean;
};

type EditEmployeeProfileModalProps = {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSave: (payload: EditEmployeeProfileSavePayload) => Promise<void>;
  isSaving?: boolean;
};

export function EditEmployeeProfileModal({
  isOpen,
  employee,
  onClose,
  onSave,
  isSaving = false,
}: EditEmployeeProfileModalProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditEmployeeProfileForm>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (!isOpen || !employee) return;
    reset({ name: employee.name, phone: employee.phone ?? '' });
    setPhotoPreview(employee.profilePictureUrl ?? null);
    photoFileRef.current = null;
    setPhotoRemoved(false);
  }, [isOpen, employee, reset]);

  if (!employee) return null;

  const displayPhoto =
    photoRemoved ? null : photoPreview ?? employee.profilePictureUrl ?? null;

  function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB');
      return;
    }
    photoFileRef.current = file;
    setPhotoRemoved(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    photoFileRef.current = null;
    setPhotoPreview(null);
    setPhotoRemoved(true);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Employee Profile"
      subtitle={`ID: ${formatEmployeeDisplayId(employee.id)}`}
      size="lg"
      className="max-w-[540px] rounded-[28px]"
      bodyClassName="p-0"
      headerClassName="rounded-t-[28px] border-b border-[#E9E8E6] px-6 py-5"
    >
      <form
        onSubmit={handleSubmit(async (values) => {
          await onSave({
            values,
            photoFile: photoFileRef.current,
            photoRemoved,
          });
        })}
      >
        <div className="space-y-5 px-6 py-5">
          {/* Profile picture — grey panel */}
          <div className="flex items-center gap-4 rounded-xl bg-[#F5F5F4] p-4">
            <div className="relative shrink-0">
              <div className="size-[88px] overflow-hidden rounded-xl bg-[#E9E8E6]">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[#FFF4E5]">
                    <span className="text-3xl font-extrabold text-[#904D00]">
                      {(employee.name?.trim()?.[0] ?? '?').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[#904D00] text-white shadow-sm ring-2 ring-white"
                aria-label="Edit profile photo"
              >
                <Pencil className="size-3.5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#212121]">Profile Picture</p>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="mt-2.5 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-semibold text-[#212121] transition hover:bg-[#FAFAF9]"
              >
                Update Photo
              </button>
              {(displayPhoto || employee.profilePictureUrl) && !photoRemoved ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="mt-2 block text-sm font-semibold text-red-600 transition hover:text-red-700"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoPick}
            />
          </div>

          {/* Employee name */}
          <div>
            <label htmlFor="edit-employee-name" className={employeeModalFieldLabelClass}>
              Employee Name
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
                strokeWidth={2}
                aria-hidden
              />
              <input
                id="edit-employee-name"
                className={cn(employeeModalFieldInputClass, 'pl-11')}
                placeholder="e.g. Julian Marc"
                {...register('name')}
              />
            </div>
            {errors.name?.message ? (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            ) : null}
          </div>

          {/* Phone + joining date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-employee-phone" className={employeeModalFieldLabelClass}>
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  id="edit-employee-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className={cn(employeeModalFieldInputClass, 'pl-11')}
                  placeholder="10-digit number"
                  {...register('phone')}
                />
              </div>
              {errors.phone?.message ? (
                <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="edit-employee-joining" className={employeeModalFieldLabelClass}>
                Joining Date
              </label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  id="edit-employee-joining"
                  readOnly
                  value={formatJoiningDateInput(employee.createdAt)}
                  className={cn(employeeModalFieldInputClass, 'cursor-default pl-11 text-[#57534e]')}
                />
              </div>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-end gap-5 border-t border-[#E9E8E6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-sm font-bold text-[#57534e] transition hover:text-[#212121] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[#F38137] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(243,129,55,0.4)] transition hover:bg-[#E6742A] disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
