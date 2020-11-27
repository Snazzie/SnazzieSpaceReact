import { Card, PageHeader } from "antd";
import Meta from "antd/lib/card/Meta";
import React from "react";
import "./projects.scss"
export const Projects: React.FunctionComponent = () => {
  return (
    <><PageHeader
      className="site-page-header"
      title="Projects"
    />
      <div className="grid">
        <Card
          hoverable
          onClick={() => window.open("https://github.com/darkthemehub", "_blank")}
          style={{ width: 300, height: 300 }}
          cover={
            <img
              alt="image"
              src={`https://avatars2.githubusercontent.com/u/55282763?s=400&u=6de6bebec65ca7e8102b96d354a2da3102919da9&v=4`}
            />
          }
          actions={[]}
        >
          <Meta
            title="Dark Theme Hub"
            description="Quality dark themes for developers"
          />
        </Card>
        <Card
          hoverable
          onClick={() => window.open("https://github.com/Snazzie/Affinity", "_blank")}
          style={{ width: 300, height: 300, background: "#1d1d1d" }}
          cover={
            <img
              alt="image"
              src={`https://i.gyazo.com/5a5abc0e46d96b90602fc1087a9b5863.png`}
            />
          }
          actions={[]}
        >
          <Meta
            title="Affinity"
            description="Windows 10 Application Affinity (CPU Threads) Manager"
          />
        </Card>
      </div>
    </>
  );
};
