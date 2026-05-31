export function About() {
  return (
    <section id="aboutme">
      <div className="grid h-full w-full content-center p-[10%] md:p-[5%]">
        <h1 className="justify-self-center text-[60px] text-white">About me</h1>
        <div className="grid gap-2.5 md:grid-cols-2">
          <img
            className="justify-self-center md:justify-self-end"
            alt="Aaron"
            src="https://avatars.githubusercontent.com/u/19627023?v=4"
          />
          <p className="text-xl text-white">
            Name: Aaron
            <br />
            Location: England
            <br />
            Loves Languages: C#, Typescript, Rust
            <br />
            Dislikes Languages: Javascript, Go, Python, Bash, Powershell, Xamarin, Ruby
            <br />
            Strength: Yo mama
            <br />
            Weakness: Energy drinks, alchohol and coffee makes him sleepy
          </p>
        </div>
      </div>
    </section>
  );
}
