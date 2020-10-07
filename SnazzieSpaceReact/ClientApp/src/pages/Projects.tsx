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
      onClick={() =>window.open("https://github.com/darkthemehub", "_blank")}
        style={{ width: 300 }}
        cover={
          <img
            alt="example"
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

      </div>
    </>
  );
};
