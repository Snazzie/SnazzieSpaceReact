import { Layout, Menu } from 'antd';
import React, { Children } from 'react';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  VideoCameraOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router } from "react-router-dom";
import "./Main.css";
const { Header, Sider, Content } = Layout;
export const Main: React.FunctionComponent = props => {

  const [collapsed, setCollapsed] = React.useState<boolean>();

  function toggleNavbar () {
    setCollapsed(!collapsed);
  }

  
    return (
      <Router>
        <Layout>
        <Sider trigger={null} collapsible collapsed={collapsed} >
          <div className="logo" />
          <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
            <Menu.Item key="1" icon={<UserOutlined />}>
              nav 1
            </Menu.Item>
            <Menu.Item key="2" icon={<VideoCameraOutlined />}>
              nav 2
            </Menu.Item>
            <Menu.Item key="3" icon={<UploadOutlined />}>
              nav 3
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: toggleNavbar,
            })}
          </Header>
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

