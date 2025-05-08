'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AuthForm } from '@/components/custom/auth-form';
import { SubmitButton } from '@/components/custom/submit-button';

import { login, LoginActionState } from '../actions';
import bpjsLogo from './logo-white.png'

export default function Page() {
    const router = useRouter();

    const [email, setEmail] = useState('');

    const [state, formAction] = useActionState<LoginActionState, FormData>(
        login,
        {
            status: 'idle',
        }
    );

    useEffect(() => {
        if (state.status === 'failed') {
            toast.error('Invalid credentials!');
        } else if (state.status === 'invalid_data') {
            toast.error('Failed validating your submission!');
        } else if (state.status === 'success') {
            router.refresh();
        }
    }, [state.status, router]);

    const handleSubmit = (formData: FormData) => {
        setEmail(formData.get('email') as string);
        formAction(formData);
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background bg-gradient-to-br from-green-400 to-blue-500">
            <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
                <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
                    <h1 className="text-5xl font-light dark:text-zinc-50 text-green-800">LOGIN</h1>
                    {/* <Image
                        src={bpjsLogo}
                        alt="Picture of the author"
                    /> */}

                    <p className="text-6xl font-bold" style={{ fontFamily: "'Comfortaa', cursive" }}>
                        <span className="text-[#229753]">T.I.T.I.K.</span><span className="text-[#FFA76C]"></span>
                    </p>
                </div>
                <AuthForm action={handleSubmit} defaultEmail={email}>
                    <SubmitButton>Login</SubmitButton>
                </AuthForm>
            </div>
        </div>
    );
}
