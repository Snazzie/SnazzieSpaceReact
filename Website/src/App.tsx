import React from "react";
import { Route } from "react-router";
import { Switch } from "react-router-dom";
import { Main } from "./components/Main";

import "./custom.css";
import { Home } from "./pages/Home";

const App: React.FunctionComponent = () => {
  return (
    <Switch>
      <Main>
        <Route path="/" component={Home}></Route>
      </Main>
    </Switch>
  );
};
export default App;
