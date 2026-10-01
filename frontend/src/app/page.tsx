import Link from "next/link";
import { PublicLayout } from "@/components";

export default function Home() {
  return (
    <PublicLayout>
      <section className="flex flex-col items-start gap-6 py-10 sm:py-16">
        <p className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Tenis · Fútbol · Pádel
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          Reservá tu cancha en el Club Deportivo
        </h1>
        <p className="max-w-xl text-lg text-text-secondary">
          Consultá disponibilidad, gestioná turnos y alquilá equipamiento. Un gerente aprueba tu
          cuenta y ya podés jugar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-2"
          >
            Registrarse
          </Link>
          <Link
            href="/availability"
            className="rounded-xl px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Ver disponibilidad
          </Link>
        </div>
      </section>

      <section className="grid gap-4 py-8 sm:grid-cols-3">
        {[
          { step: "1", title: "Registrate", body: "Completá tus datos y enviá la solicitud." },
          { step: "2", title: "Te aprueban", body: "Un gerente revisa y activa tu cuenta." },
          { step: "3", title: "Reservá", body: "Elegí disciplina, cancha y franja horaria." },
        ].map((item) => (
          <article key={item.step} className="rounded-2xl border border-border bg-surface p-5">
            <span className="text-sm font-bold text-primary">Paso {item.step}</span>
            <h2 className="mt-2 text-lg font-semibold text-text-primary">{item.title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{item.body}</p>
          </article>
        ))}
      </section>
    </PublicLayout>
  );
}
