import { Badge } from "@/components/ui/badge";

export function About() {
  return (
    <section id="aboutme" className="mx-auto max-w-5xl px-6 py-24 md:py-32">
      <h1 className="mb-10 text-3xl font-semibold md:text-4xl">About me</h1>
      <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
        <img
          className="h-40 w-40 rounded-full border border-border object-cover"
          alt="Aaron"
          src="https://avatars.githubusercontent.com/u/19627023?v=4"
        />
        <div className="flex flex-col gap-4">
          <p className="leading-relaxed text-muted-foreground">
            Name: Aaron
            <br />
            Location: England
            <br />
            Dislikes Languages: Javascript, Go, Python, Bash, Powershell, Xamarin, Ruby
            <br />
            Strength: Yo mama
            <br />
            Weakness: Energy drinks, alchohol and coffee makes him sleepy
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Loves languages:</span>
            <Badge variant="secondary">C#</Badge>
            <Badge variant="secondary">Typescript</Badge>
            <Badge variant="secondary">Rust</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
