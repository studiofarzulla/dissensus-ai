%% dai-working-paper.cls
%% Dissensus AI Working Paper Series document class
%% https://dissensus.ai
%%
%% Usage: \documentclass{dai-working-paper}
%%
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{dai-working-paper}[2026/02/04 Dissensus AI Working Paper Series]

%% Base class
\LoadClass[11pt,a4paper]{article}

%% ---- Packages ----
\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}
\RequirePackage{lmodern}
\RequirePackage[margin=2.5cm]{geometry}
\RequirePackage{amsmath,amssymb,amsthm}
\RequirePackage{graphicx}
\RequirePackage{xcolor}
\RequirePackage{hyperref}
\RequirePackage[authoryear,round]{natbib}
\RequirePackage{setspace}
\RequirePackage{fancyhdr}
\RequirePackage{titlesec}
\RequirePackage{enumitem}
\RequirePackage{booktabs}
\RequirePackage{etoolbox}

%% ---- Colours ----
\definecolor{daicrimson}{HTML}{DC143C}
\definecolor{daigray}{HTML}{555555}

%% ---- Hyperref setup ----
\hypersetup{
  colorlinks=true,
  linkcolor=daicrimson,
  citecolor=daicrimson,
  urlcolor=daicrimson,
}

%% ---- Metadata commands ----
\newcommand{\@wpyear}{}
\newcommand{\@wpnum}{}
\newcommand{\@programme}{}
\newcommand{\@daidoi}{}
\newcommand{\@keywords}{}
\newcommand{\@jelcodes}{}
\newcommand{\@correspondingauthor}{}
\newcommand{\@orcid}{}

\newcommand{\dai}[2]{\renewcommand{\@wpyear}{#1}\renewcommand{\@wpnum}{#2}}
\newcommand{\programme}[1]{\renewcommand{\@programme}{#1}}
\newcommand{\doidoi}[1]{\renewcommand{\@daidoi}{#1}}
\newcommand{\keywords}[1]{\renewcommand{\@keywords}{#1}}
\newcommand{\jelcodes}[1]{\renewcommand{\@jelcodes}{#1}}
\newcommand{\correspondingauthor}[1]{\renewcommand{\@correspondingauthor}{#1}}
\newcommand{\orcid}[1]{\renewcommand{\@orcid}{#1}}

%% ---- Theorem environments ----
\theoremstyle{plain}
\newtheorem{theorem}{Theorem}[section]
\newtheorem{proposition}[theorem]{Proposition}
\newtheorem{lemma}[theorem]{Lemma}
\newtheorem{corollary}[theorem]{Corollary}

\theoremstyle{definition}
\newtheorem{definition}[theorem]{Definition}
\newtheorem{assumption}[theorem]{Assumption}
\newtheorem{example}[theorem]{Example}

\theoremstyle{remark}
\newtheorem{remark}[theorem]{Remark}

%% ---- Section formatting ----
\titleformat{\section}{\large\bfseries}{\thesection.}{0.5em}{}
\titleformat{\subsection}{\normalsize\bfseries}{\thesubsection}{0.5em}{}

%% ---- Header/footer ----
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textcolor{daigray}{DAI-WP-\@wpyear-\@wpnum}}
\fancyhead[R]{\small\textcolor{daigray}{Dissensus AI}}
\fancyfoot[C]{\small\thepage}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0pt}

%% ---- Title page ----
\renewcommand{\maketitle}{%
  \thispagestyle{empty}
  \begin{center}
    \vspace*{2cm}
    {\Large\textbf{Dissensus AI Working Paper Series}}\\[0.3cm]
    {\large\textcolor{daigray}{Adversarial Systems \& Complexity Research Initiative}}\\[0.5cm]
    \rule{0.6\textwidth}{0.5pt}\\[2cm]
    {\LARGE\bfseries\@title}\\[1cm]
    {\large\@author}\\[0.5cm]
    \ifdefempty{\@orcid}{}{%
      {\small ORCID: \href{https://orcid.org/\@orcid}{\@orcid}}\\[0.3cm]%
    }
    \vfill
    {\normalsize
      \textbf{Working Paper No.}~DAI-WP-\@wpyear-\@wpnum\\[0.3cm]
      \ifdefempty{\@programme}{}{%
        \textbf{Programme:}~\@programme\\[0.3cm]%
      }
      \ifdefempty{\@daidoi}{}{%
        \textbf{DOI:}~\href{https://doi.org/\@daidoi}{\@daidoi}\\[0.3cm]%
      }
      \ifdefempty{\@correspondingauthor}{}{%
        \textbf{Corresponding author:}~\@correspondingauthor\\[0.3cm]%
      }
      \@date
    }\\[1cm]
    \rule{0.6\textwidth}{0.5pt}\\[0.5cm]
    {\small\textcolor{daigray}{\url{https://dissensus.ai}}}
  \end{center}
  \newpage
}

%% ---- Abstract environment ----
\renewenvironment{abstract}{%
  \begin{center}
    {\large\bfseries Abstract}
  \end{center}
  \begin{quote}\small
}{%
  \end{quote}
  \ifdefempty{\@keywords}{}{%
    \vspace{0.3cm}
    \noindent\textbf{Keywords:}~\@keywords\\%
  }
  \ifdefempty{\@jelcodes}{}{%
    \noindent\textbf{JEL Codes:}~\@jelcodes%
  }
  \vspace{0.5cm}
  \hrule
  \vspace{0.5cm}
}

%% ---- Line spacing ----
\onehalfspacing

%% ---- Bibliography style ----
\bibliographystyle{plainnat}

\endinput
