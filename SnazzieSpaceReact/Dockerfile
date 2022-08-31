#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["SnazzieSpaceReact/SnazzieSpaceReact.csproj", "SnazzieSpaceReact/"]
RUN dotnet restore "SnazzieSpaceReact/SnazzieSpaceReact.csproj"
COPY . .
WORKDIR "/src/SnazzieSpaceReact"
RUN dotnet build "SnazzieSpaceReact.csproj" -c Release -o /app/build

FROM build AS publish
RUN apt-get update && \
    apt-get install -y nodejs \
    npm
RUN dotnet publish "SnazzieSpaceReact.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
RUN apt-get update && \
    apt-get install -y nodejs \
    npm
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SnazzieSpaceReact.dll"]