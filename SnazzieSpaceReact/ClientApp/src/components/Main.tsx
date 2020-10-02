import { Layout, Menu } from 'antd';
import React from 'react';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  StarFilled,
} from '@ant-design/icons';
import { BrowserRouter as Router } from "react-router-dom";

import { Link, useLocation } from "react-router-dom";
import "./Main.css";
const { Sider, Content } = Layout;
export const Main: React.FunctionComponent = props => {

  const [collapsed, setCollapsed] = React.useState<boolean>();

  function toggleNavbar () {
    setCollapsed(!collapsed);
  }
  const location = useLocation();
  
    return (
      <Router>
        <Layout>
        <Sider theme="dark" trigger={null} collapsible collapsed={collapsed} >
          <span>
          <div className="logo" ></div>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: toggleNavbar,
            })}
            </span>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={[location.pathname === "/" ? "/" : location.pathname + location.hash]}>
            <Menu.Item key="/" icon={<UserOutlined />}>
              Home <Link to={"/"}/>
            </Menu.Item>
              <Menu.Item key="/Projects" icon={<StarFilled />}>Projects<Link to={"/Projects"} /></Menu.Item>


          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Content
            className="site-layout-background"
            style={{
              margin: '24px 16px',
              padding: 24,
              minHeight: 280,
            }}
          >
            {props?.children}
          </Content>
          
        </Layout>
        </Layout>
     </Router>
    );
  
  }

