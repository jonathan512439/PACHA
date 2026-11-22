import { Boton } from "@/components/ui/Boton";
import { Vacio } from "@/components/ui/Vacio";

export default function NoEncontrado() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Vacio titulo="No encontramos esta página." accion={<Boton href="/">Volver al inicio</Boton>}>
        Puede que el enlace esté mal escrito o que la comunidad o la tarjeta ya no exista.
      </Vacio>
    </main>
  );
}
