import { Route, Routes } from 'react-router-dom';
import { HelperLookProvider } from './helperLook.tsx';
import { SecretCode } from './components/SecretCode.tsx';
import { StarRide } from './components/StarRide.tsx';
import { Home } from './pages/Home.tsx';
import { Who } from './pages/Who.tsx';
import { Kids } from './pages/parent/Kids.tsx';
import { Quiz } from './pages/Quiz.tsx';
import { Results } from './pages/Results.tsx';
import { AvatarPage } from './pages/AvatarPage.tsx';
import { ParentLayout } from './pages/parent/ParentLayout.tsx';
import { Dashboard } from './pages/parent/Dashboard.tsx';
import { QuizReview } from './pages/parent/QuizReview.tsx';
import { Bank } from './pages/parent/Bank.tsx';
import { SettingsPage } from './pages/parent/SettingsPage.tsx';

export function App() {
  return (
    <HelperLookProvider>
      <SecretCode />
      <StarRide />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/who" element={<Who />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        <Route path="/avatar" element={<AvatarPage />} />
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="quiz/:id" element={<QuizReview />} />
          <Route path="kids" element={<Kids />} />
          <Route path="bank" element={<Bank />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </HelperLookProvider>
  );
}
